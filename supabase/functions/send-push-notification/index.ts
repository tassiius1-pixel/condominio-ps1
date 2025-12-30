import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAccessToken(serviceAccount: any) {
    const jwt = await create(
        { alg: "RS256", typ: "JWT" },
        {
            iss: serviceAccount.client_email,
            scope: "https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore",
            aud: "https://oauth2.googleapis.com/token",
            exp: getNumericDate(3600),
            iat: getNumericDate(0),
        },
        await crypto.subtle.importKey(
            "pkcs8",
            new TextEncoder().encode(serviceAccount.private_key.replace(/\\n/g, '\n')).buffer,
            { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
            false,
            ["sign"]
        )
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
    return data.access_token;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { userId, title, body } = await req.json()
        const saEnv = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
        if (!saEnv) throw new Error("FIREBASE_SERVICE_ACCOUNT secret not found")

        const serviceAccount = JSON.parse(saEnv)
        const accessToken = await getAccessToken(serviceAccount)

        // 1. Buscar tokens no Firestore via REST API
        // (Ajuste o project_id se necessário)
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents/users`;
        const firestoreRes = await fetch(firestoreUrl, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const firestoreData = await firestoreRes.json();
        let tokens: string[] = [];

        if (userId === "all") {
            tokens = firestoreData.documents
                ?.map((doc: any) => doc.fields.fcmToken?.stringValue)
                .filter((t: string) => !!t) || [];
        } else {
            // Busca específica por usuário
            const userDoc = await fetch(`${firestoreUrl}/${userId}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const userData = await userDoc.json();
            const t = userData.fields?.fcmToken?.stringValue;
            if (t) tokens.push(t);
        }

        console.log(`📡 Enviando para ${tokens.length} tokens...`);

        // 2. Enviar via FCM v1
        const results = await Promise.all(tokens.map(async (token) => {
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
                            fcm_options: { link: "https://condominio-ps1.vercel.app/" }
                        }
                    }
                })
            });
            return fcmRes.json();
        }));

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
