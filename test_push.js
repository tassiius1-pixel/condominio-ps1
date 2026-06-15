import https from 'node:https';

const SUPABASE_URL = "hjrhipbzuzkxrzlffwlb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqcmhpcGJ6dXpreHJ6bGZmd2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMTQ4MzYsImV4cCI6MjA3Njg5MDgzNn0.U_vULHQwfEs1eVV_q5spNzkSnCJT4T6gxise1JgHCZ4";

const postData = JSON.stringify({
    userId: "all",
    title: "Teste Antigravity",
    body: "Notificação de teste enviada via script local nativo ES6.",
    data: {
        origem: "script_teste"
    }
});

const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/functions/v1/send-push-notification',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log("Iniciando requisição HTTPS para a Edge Function...");

const req = https.request(options, (res) => {
    console.log(`Status HTTP retornado: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log("Resposta do servidor:");
        try {
            const parsed = JSON.parse(data);
            console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
            console.log(data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Erro na requisição: ${e.message}`);
});

req.write(postData);
req.end();
