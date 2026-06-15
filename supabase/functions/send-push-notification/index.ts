// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper para converter PEM para ArrayBuffer (DER)
function pemToBinary(pem: string) {
    const b64 = pem
        .replace(/-----BEGIN PRIVATE KEY-----/, "")
        .replace(/-----END PRIVATE KEY-----/, "")
        .replace(/\s/g, "");

    // No Deno, podemos usar atob para decodificar base64
    const binaryString = atob(b64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

async function getAccessToken(serviceAccount: any) {
    try {
        const privateKeyBuffer = pemToBinary(serviceAccount.private_key);

        const cryptoKey = await crypto.subtle.importKey(
            "pkcs8",
            privateKeyBuffer,
            { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
            false,
            ["sign"]
        );

        const jwt = await create(
            { alg: "RS256", typ: "JWT" },
            {
                iss: serviceAccount.client_email,
                scope: "https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore",
                aud: "https://oauth2.googleapis.com/token",
                exp: getNumericDate(3600),
                iat: getNumericDate(0),
            },
            cryptoKey
        );

        const res = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
                assertion: jwt,
            }),
        });

        const data = await res.json();
        if (data.error) throw new Error(`Google Auth: ${data.error_description || data.error}`);
        return data.access_token;
    } catch (err) {
        throw new Error(`Erro na Chave Privada: ${err.message}`);
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const textBody = await req.text();
        let bodyData;
        try {
            bodyData = JSON.parse(textBody);
        } catch (e) {
            throw new Error(`Corpo inválido: ${e.message}`);
        }

        const { userId, userIds, title, body, data: extraData } = bodyData;
        const saEnv = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
        if (!saEnv) throw new Error("FIREBASE_SERVICE_ACCOUNT não configurada.");

        const serviceAccount = JSON.parse(saEnv.trim().replace(/^\uFEFF/, ''));
        const accessToken = await getAccessToken(serviceAccount);

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

        let tokens: string[] = [];

        if (userId === "all") {
            const { data: pushTokens, error: dbError } = await supabaseClient
                .from("user_push_tokens")
                .select("token");

            if (dbError) throw new Error(`Database Error: ${dbError.message}`);
            tokens = pushTokens?.map((t: any) => t.token) || [];
        } else if (userIds && Array.isArray(userIds)) {
            const { data: pushTokens, error: dbError } = await supabaseClient
                .from("user_push_tokens")
                .select("token")
                .in("user_id", userIds);

            if (dbError) throw new Error(`Database Error: ${dbError.message}`);
            tokens = pushTokens?.map((t: any) => t.token) || [];
        } else {
            const { data: pushTokens, error: dbError } = await supabaseClient
                .from("user_push_tokens")
                .select("token")
                .eq("user_id", userId);

            if (dbError) throw new Error(`Database Error: ${dbError.message}`);
            tokens = pushTokens?.map((t: any) => t.token) || [];
        }

        tokens = [...new Set(tokens)].filter((t) => !!t);

        if (tokens.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: "Nenhum celular registrado para receber push."
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const results = await Promise.all(tokens.map(async (token) => {
            try {
                const fcmRes = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${accessToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        message: {
                            token: token,
                            // 🔥 O campo 'notification' no topo garante o pop-up nativo no Android/iOS em Background
                            notification: {
                                title: title,
                                body: body
                            },
                            data: {
                                title: title,
                                body: body,
                                tag: "gestao-ps1",
                                ...extraData
                            },
                            android: {
                                priority: "high",
                                notification: {
                                    sound: "default",
                                    icon: "stock_ticker_update",
                                    color: "#4f46e5"
                                }
                            },
                            apns: {
                                headers: {
                                    "apns-priority": "10",
                                    "apns-push-type": "alert"
                                },
                                payload: {
                                    aps: {
                                        alert: { title, body },
                                        sound: "default",
                                        badge: 1,
                                        "mutable-content": 1,
                                        category: "gestao-ps1"
                                    }
                                }
                            },
                            webpush: {
                                headers: { "Urgency": "high" },
                                notification: {
                                    title,
                                    body,
                                    icon: "/favicon.png",
                                    badge: "/favicon.png",
                                    tag: "gestao-ps1",
                                    renotify: true
                                },
                                fcm_options: {
                                    link: extraData?.url || "https://condominio-ps1.vercel.app/"
                                }
                            }
                        }
                    })
                });
                const responseData = await fcmRes.json();
                return { token: token.substring(0, 10) + "...", status: fcmRes.status, response: responseData };
            } catch (err) {
                return { token: token.substring(0, 10) + "...", error: err.message };
            }
        }));

        console.log("✅ [Push] Resultados do envio:", JSON.stringify(results));

        return new Response(JSON.stringify({ success: true, count: tokens.length, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return new Response(JSON.stringify({
            error: error.message,
            hint: "Certifique-se que o JSON da Secret no Supabase está IDÊNTICO ao arquivo baixado do Firebase."
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
