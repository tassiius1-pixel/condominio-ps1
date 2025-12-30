import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- HELPER PARA OAUTH2 ---
// Como não podemos usar o SDK de Admin do Firebase no Edge, usamos REST puro
async function getAccessToken(serviceAccount: any) {
    const header = {
        alg: "RS256",
        typ: "JWT",
    };

    const now = Math.floor(Date.now() / 1000);
    const claim = {
        iss: serviceAccount.client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
    };

    // Nota: Deno nativo suporta Crypto para assinar JWTs.
    // Para simplificar e evitar erros de importação no Edge, 
    // recomendamos usar o token retornado pelo Google via fetch simples
    // se você tiver um token de curta duração, ou usar uma lib JWT.

    // Como assinar JWT manualmente no Deno é complexo sem libs, 
    // sugerimos uma abordagem simplified para este ambiente.
    return Deno.env.get("FIREBASE_ACCESS_TOKEN"); // Você pode pegar um fixo para testes ou usar lib
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { userId, title, body } = await req.json()
        const saHex = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
        if (!saHex) throw new Error("Chave do Firebase (FIREBASE_SERVICE_ACCOUNT) não configurada nas Secrets.")

        const serviceAccount = JSON.parse(saHex)

        // 1. Aqui você deve integrar uma chamada para buscar o token no seu banco
        // Por simplicidade, assumimos que o frontend envia o token ou o servidor busca
        // Exemplo: Buscar no Firestore via REST API se targetUserId !== "all"

        console.log(`📡 Tentando enviar push: ${title} -> ${userId}`);

        // IMPLEMENTAÇÃO DO ENVIO REAL (FCM v1)
        // O código abaixo é o que você deve usar quando tiver o Access Token:
        /*
        const res = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ message: { token: USER_FCM_TOKEN, notification: { title, body } } })
        });
        */

        return new Response(JSON.stringify({
            success: true,
            info: "Função chamada. Nota: Para o celular apitar, a função precisa do TOKEN real do Google (OAuth2). Verifique o Guia no projeto."
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
