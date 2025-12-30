import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts"

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

        const { userId, title, body } = bodyData;
        const saEnv = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
        if (!saEnv) throw new Error("FIREBASE_SERVICE_ACCOUNT não configurada.");

        const serviceAccount = JSON.parse(saEnv.trim().replace(/^\uFEFF/, ''));
        const accessToken = await getAccessToken(serviceAccount);

        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents/users`;
        const firestoreRes = await fetch(firestoreUrl, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const firestoreData = await firestoreRes.json();
        if (firestoreData.error) throw new Error(`Firestore: ${firestoreData.error.message}`);

        let tokens: string[] = [];

        if (userId === "all") {
            tokens = firestoreData.documents
                ?.map((doc: any) => doc.fields?.fcmToken?.stringValue)
                .filter((t: string | undefined) => !!t) || [];
        } else {
            const userDocRes = await fetch(`${firestoreUrl}/${userId}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const userData = await userDocRes.json();
            const t = userData.fields?.fcmToken?.stringValue;
            if (t) tokens.push(t);
        }

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
                            data: {
                                title: title,
                                body: body,
                                tag: "gestao-ps1",
                                url: "https://condominio-ps1.vercel.app/"
                            },
                            android: {
                                priority: "high",
                                notification: {
                                    sound: "default",
                                    click_action: "https://condominio-ps1.vercel.app/",
                                    tag: "gestao-ps1"
                                }
                            },
                            apns: {
                                headers: { "apns-priority": "10" },
                                payload: {
                                    aps: {
                                        alert: { title, body },
                                        sound: "default",
                                        badge: 1,
                                        "mutable-content": 1
                                    }
                                }
                            },
                            webpush: {
                                headers: { "Urgency": "high" },
                                notification: {
                                    icon: "/logo.png",
                                    badge: "/logo.png",
                                    tag: "gestao-ps1",
                                    renotify: true,
                                    requireInteraction: true,
                                    vibrate: [200, 100, 200]
                                },
                                fcm_options: {
                                    link: "https://condominio-ps1.vercel.app/"
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
