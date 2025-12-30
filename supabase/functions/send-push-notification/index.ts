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
        console.log(`[LOG] Corpo recebido: ${textBody}`);

        let bodyData;
        try {
            bodyData = JSON.parse(textBody);
        } catch (e) {
            throw new Error(`JSON Inválido no corpo: ${e.message}`);
        }

        const { userId, title, body } = bodyData;
        const saEnv = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
        if (!saEnv) throw new Error("FIREBASE_SERVICE_ACCOUNT não definida.");

        const serviceAccount = JSON.parse(saEnv.trim().replace(/^\uFEFF/, ''));
        const accessToken = await getAccessToken(serviceAccount);

        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents/users`;
        console.log(`[LOG] Buscando usuários em: ${firestoreUrl}`);

        const firestoreRes = await fetch(firestoreUrl, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const firestoreData = await firestoreRes.json();
        if (firestoreData.error) throw new Error(`Firestore Error: ${firestoreData.error.message}`);

        let tokens: string[] = [];

        if (userId === "all") {
            const rawTokens = (firestoreData.documents || [])
                .map((doc: any) => doc.fields?.fcmToken?.stringValue)
                .filter((t: any) => t && typeof t === 'string' && t.length > 5);

            tokens = [...new Set(rawTokens)];
            console.log(`[LOG] Modo ALL: Encontrados ${tokens.length} tokens únicos.`);
        } else {
            // Documento individual
            const userDocRes = await fetch(`${firestoreUrl}/${userId}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const userData = await userDocRes.json();
            const t = userData.fields?.fcmToken?.stringValue;
            if (t && t.length > 5) tokens.push(t);
            console.log(`[LOG] Modo INDIVIDUAL (${userId}): Token ${t ? 'encontrado' : 'não encontrado'}.`);
        }

        if (tokens.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: "Aviso: Nenhum token de destino encontrado no Firestore."
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        console.log(`[LOG] Iniciando envio para ${tokens.length} dispositivos...`);

        const deliveryResults = await Promise.allSettled(tokens.map(async (token) => {
            const res = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
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
                                icon: "https://condominio-ps1.vercel.app/logo.png"
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
            return res.json();
        }));

        console.log(`[LOG] Envio concluído. Verifique o campo results para detalhes de cada token.`);

        return new Response(JSON.stringify({
            success: true,
            count: tokens.length,
            results: deliveryResults
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error(`[CRITICAL ERROR] ${error.message}`);
        return new Response(JSON.stringify({
            error: error.message,
            hint: "Consulte os logs da Edge Function no Supabase para ver o erro detalhado."
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
