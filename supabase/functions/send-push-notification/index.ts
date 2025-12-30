import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function pemToBinary(pem: string) {
    const b64 = pem
        .replace(/-----BEGIN PRIVATE KEY-----/, "")
        .replace(/-----END PRIVATE KEY-----/, "")
        .replace(/\s/g, "");

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
            throw new Error(`Corpo da requisição inválido: ${e.message}`);
        }

        const { userId, title, body } = bodyData;
        const saEnv = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
        if (!saEnv) throw new Error("FIREBASE_SERVICE_ACCOUNT não configurada nas Secrets.");

        const serviceAccount = JSON.parse(saEnv.trim().replace(/^\uFEFF/, ''));
        const accessToken = await getAccessToken(serviceAccount);

        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents/users`;
        const firestoreRes = await fetch(firestoreUrl, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const firestoreData = await firestoreRes.json();
        if (firestoreData.error) throw new Error(`Erro Firestore: ${firestoreData.error.message}`);

        let tokens: string[] = [];

        if (userId === "all") {
            // Busca todos os tokens salvos na tabela de usuários
            const rawTokens = (firestoreData.documents || [])
                .map((doc: any) => doc.fields?.fcmToken?.stringValue)
                .filter((t: any) => typeof t === 'string' && t.length > 0);

            // Remove duplicados de forma garantida
            tokens = Array.from(new Set(rawTokens)) as string[];
            console.log(`[FCM] Alvo: todos. Encontrados ${tokens.length} tokens únicos.`);
        } else {
            // Busca token de um usuário específico
            const userDocRes = await fetch(`${firestoreUrl}/${userId}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const userData = await userDocRes.json();
            const t = userData.fields?.fcmToken?.stringValue;
            if (t) tokens.push(t);
            console.log(`[FCM] Alvo: ${userId}. Token: ${t ? 'Encontrado' : 'Não encontrado'}`);
        }

        if (tokens.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: "Nenhum dispositivo encontrado para receber a notificação."
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Tenta enviar para cada dispositivo, usando Promise.allSettled para não travar se um falhar
        const deliveryResults = await Promise.allSettled(tokens.map(async (token) => {
            const fcmRes = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: {
                        token: token,
                        notification: { title, body },
                        webpush: {
                            fcm_options: { link: "https://condominio-ps1.vercel.app/" },
                            notification: {
                                icon: "https://condominio-ps1.vercel.app/logo.png",
                                badge: "https://condominio-ps1.vercel.app/logo.png"
                            }
                        },
                        apns: {
                            payload: {
                                aps: {
                                    alert: { title, body },
                                    sound: "default",
                                    badge: 1,
                                    "content-available": 1
                                }
                            }
                        }
                    }
                })
            });
            return fcmRes.json();
        }));

        return new Response(JSON.stringify({
            success: true,
            count: tokens.length,
            results: deliveryResults
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error(`[FCM ERROR] ${error.message}`);
        return new Response(JSON.stringify({
            error: error.message,
            hint: "Verifique os logs da função no painel do Supabase para mais detalhes."
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
