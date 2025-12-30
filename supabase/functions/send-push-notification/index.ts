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
            scope: "https://www.googleapis.com/auth/firebase.messaging",
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
    return data.access_token;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { userId, title, body } = await req.json();
        const saEnv = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
        const serviceAccount = JSON.parse(saEnv!.trim().replace(/^\uFEFF/, ''));
        const accessToken = await getAccessToken(serviceAccount);

        const projectPath = `projects/${serviceAccount.project_id}/databases/(default)/documents`;
        const firestoreUrl = `https://firestore.googleapis.com/v1/${projectPath}/users`;

        const firestoreRes = await fetch(firestoreUrl, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const firestoreData = await firestoreRes.json();

        let tokens: string[] = [];
        if (userId === "all") {
            const rawTokens = (firestoreData.documents || [])
                .map((doc: any) => doc.fields?.fcmToken?.stringValue)
                .filter((t: any) => !!t && t.length > 10);
            tokens = Array.from(new Set(rawTokens)) as string[];
        } else {
            const userDocRes = await fetch(`${firestoreUrl}/${userId}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const userData = await userDocRes.json();
            const t = userData.fields?.fcmToken?.stringValue;
            if (t && t.length > 10) tokens.push(t);
        }

        if (tokens.length === 0) {
            return new Response(JSON.stringify({ success: true, count: 0 }), { headers: corsHeaders });
        }

        const results = await Promise.allSettled(tokens.map(async (token) => {
            return fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: {
                        token: token,
                        notification: { title, body },
                        android: {
                            priority: "high",
                            notification: { sound: "default" }
                        },
                        apns: {
                            payload: {
                                aps: {
                                    sound: "default",
                                    badge: 1
                                }
                            }
                        },
                        webpush: {
                            headers: { Urgency: "high" },
                            notification: {
                                title: title,
                                body: body,
                                icon: "https://condominio-ps1.vercel.app/logo.png",
                                badge: "https://condominio-ps1.vercel.app/logo.png"
                            },
                            fcm_options: { link: "https://condominio-ps1.vercel.app/" }
                        }
                    }
                })
            }).then(r => r.json());
        }));

        return new Response(JSON.stringify({ success: true, count: tokens.length, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
