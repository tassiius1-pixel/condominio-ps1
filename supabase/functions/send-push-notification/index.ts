import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Check if body exists before parsing
        const text = await req.text();
        if (!text) {
            return new Response(JSON.stringify({ error: "Empty request body" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        const bodyData = JSON.parse(text);
        const { userId, title, body } = bodyData;

        console.log(`📡 Recebido pedido de push para ${userId}: ${title}`);

        // Aqui o servidor Supabase processaria o envio real...
        // Por enquanto, apenas confirmamos o recebimento.

        return new Response(JSON.stringify({
            success: true,
            message: "Servidor Supabase recebeu o pedido de push com sucesso!",
            received: { userId, title }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error("❌ Erro na Edge Function:", error.message);
        return new Response(JSON.stringify({
            error: error.message,
            stack: error.stack
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
