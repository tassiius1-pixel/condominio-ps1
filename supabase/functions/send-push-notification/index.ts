import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAccessToken(serviceAccount: any) {
    try {
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
        if (data.error) throw new Error(`Google Auth Error: ${data.error_description || data.error}`);
        return data.access_token;
    } catch (err) {
        throw new Error(`Auth Exception: ${err.message}`);
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        // 1. Validar corpo da requisição
        const textBody = await req.text();
        let bodyData;
        try {
            bodyData = JSON.parse(textBody);
        } catch (e) {
            throw new Error(`Corpo da requisição inválido: ${e.message}`);
        }

        const { userId, title, body } = bodyData;

        // 2. Validar Secret do Firebase
        const saEnv = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
        if (!saEnv) throw new Error("FIREBASE_SERVICE_ACCOUNT não configurada.");

        let serviceAccount;
        try {
            // Tenta remover caracteres invisíveis que o PowerShell pode ter inserido
            const cleanSa = saEnv.trim().replace(/^\uFEFF/, '');
            serviceAccount = JSON.parse(cleanSa);
        } catch (e) {
            console.error("DEBUG SECRET:", saEnv.substring(0, 20) + "...");
            throw new Error(`Erro na Secret FIREBASE_SERVICE_ACCOUNT (JSON inválido): ${e.message}`);
        }

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
                message: "Nenhum dispositivo encontrado."
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

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
                        webpush: { fcm_options: { link: "https://condominio-ps1.vercel.app/" } }
                    }
                })
            });
            return fcmRes.json();
        }));

        return new Response(JSON.stringify({ success: true, count: tokens.length, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return new Response(JSON.stringify({
            error: error.message,
            hint: "Se o erro for 'JSON inválido na Secret', tente reconfigurar a FIREBASE_SERVICE_ACCOUNT no painel do Supabase."
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
