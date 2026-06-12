import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Carrega variáveis do .env.local manualmente
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Variáveis do Supabase não encontradas no .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
  const testEmail = `morador.ps1.teste.${Date.now()}@gmail.com`;
  const testPassword = 'Password123!';
  
  console.log(`⏳ Testando cadastro para: ${testEmail}...`);
  
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        name: 'Usuário Teste Cadastro',
        username: 'test_signup',
        cpf: '00000000000',
        houseNumber: '999',
        phone: '11999999999',
        role: 'MORADOR'
      }
    }
  });

  if (error) {
    console.error("❌ Erro no cadastro:", error.message);
    process.exit(1);
  }

  console.log("✅ Cadastro efetuado com sucesso!");
  console.log("Dados do usuário retornado:", {
    id: data.user?.id,
    email: data.user?.email,
    confirmed_at: data.user?.email_confirmed_at,
    identities: data.user?.identities
  });

  // Tentar fazer login imediatamente para ver se exige confirmação
  console.log(`⏳ Testando login imediato para verificar necessidade de confirmação de e-mail...`);
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (loginError) {
    console.warn("⚠️ Falha no login imediato:", loginError.message);
    console.log("Isso significa que a confirmação de e-mail provavelmente está ATIVADA no Supabase Auth.");
  } else {
    console.log("🎉 Login efetuado com sucesso! A confirmação de e-mail está DESATIVADA no Supabase (usuário pode logar imediatamente).");
    
    // Limpeza: Deleta o usuário criado no banco público (profiles) via SQL ou deleta se possível.
    // Como a chave anon não tem poder de delete no auth, deixamos lá ou limpamos a tabela profiles.
  }
}

runTest().catch(console.error);
