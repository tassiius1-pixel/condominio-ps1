import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configurações do Firebase extraídas de services/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyBlhc0D_5SUQMZsp-7M-mxvGHQ_IkZHXww",
  authDomain: "manutencao-condominio-ps1.firebaseapp.com",
  projectId: "manutencao-condominio-ps1",
  storageBucket: "manutencao-condominio-ps1.appspot.com",
  messagingSenderId: "581878893480",
  appId: "1:581878893480:web:fe0f06205e1c5e8e5aeb9d",
};

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
  console.error("❌ Credenciais do Supabase não encontradas no .env.local");
  process.exit(1);
}

// Inicializações
const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ========================================================
// ⚠️ CONTROLE DE SEGURANÇA: DRY RUN POR PADRÃO
// Se DRY_RUN for true, o script apenas lerá os dados e simulará.
// Mude para false para executar a gravação real no Supabase.
// ========================================================
const DRY_RUN = false; 

async function migrate() {
  console.log(`====================================================`);
  console.log(`🚀 INICIANDO SCRIPT DE MIGRAÇÃO: FIREBASE -> SUPABASE`);
  console.log(`⚙️ MODO: ${DRY_RUN ? '🔍 DRY RUN (SIMULAÇÃO SEM GRAVAR)' : '⚠️ REAL RUN (GRAVAÇÃO ATIVA!)'}`);
  console.log(`====================================================\n`);

  // 1. EXTRAÇÃO DE DADOS DO FIRESTORE
  console.log("⏳ Lendo dados do Firebase Firestore...");
  
  const usersSnapshot = await getDocs(collection(firestore, "users"));
  const usersList = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const requestsSnapshot = await getDocs(collection(firestore, "requests"));
  const requestsList = requestsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  const reservationsSnapshot = await getDocs(collection(firestore, "reservations"));
  const reservationsList = reservationsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  const occurrencesSnapshot = await getDocs(collection(firestore, "occurrences"));
  const occurrencesList = occurrencesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  const votingsSnapshot = await getDocs(collection(firestore, "votings"));
  const votingsList = votingsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  const noticesSnapshot = await getDocs(collection(firestore, "notices"));
  const noticesList = noticesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  const documentsSnapshot = await getDocs(collection(firestore, "documents"));
  const documentsList = documentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  const notificationsSnapshot = await getDocs(collection(firestore, "notifications"));
  const notificationsList = notificationsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`✅ Extração concluída com sucesso! Estatísticas dos dados:`);
  console.log(`   • Usuários: ${usersList.length}`);
  console.log(`   • Sugestões (Requests): ${requestsList.length}`);
  console.log(`   • Reservas: ${reservationsList.length}`);
  console.log(`   • Ocorrências: ${occurrencesList.length}`);
  console.log(`   • Votações: ${votingsList.length}`);
  console.log(`   • Avisos: ${noticesList.length}`);
  console.log(`   • Documentos: ${documentsList.length}`);
  console.log(`   • Notificações: ${notificationsList.length}\n`);

  if (DRY_RUN) {
    console.log("🔍 Simulação de mapeamento de IDs de Usuários:");
    usersList.forEach(u => {
      const cleanCpf = u.cpf ? u.cpf.replace(/\D/g, '') : '';
      const email = `${u.username.toLowerCase().replace(/\s+/g, '')}.ps1@gmail.com`;
      console.log(`   - Usuário: "${u.name}" | Email: "${email}" | Senha Provisória (CPF): "${cleanCpf}"`);
    });
    console.log(`\n✅ Dry Run finalizado com sucesso! Nenhum dado foi alterado no Supabase.`);
    console.log(`Para realizar a migração de fato, edite o arquivo 'migrate_data.js' e mude a variável 'DRY_RUN' para 'false'.`);
    return;
  }

  // 2. MIGRAÇÃO REAL
  console.log("⚠️ ATENÇÃO: Iniciando gravação real dos dados no Supabase...");

  // Mapa de IDs antigos (Firestore) para IDs novos (UUIDs do Supabase)
  const userMap = {}; // { [oldFirestoreId]: newSupabaseId }

  // A. Migrar Usuários (Criar no Supabase Auth)
  console.log("\n👤 Migrando Usuários para o Supabase Auth...");
  for (const u of usersList) {
    const cleanCpf = u.cpf ? u.cpf.replace(/\D/g, '') : '';
    const email = `${u.username.toLowerCase().replace(/\s+/g, '')}.ps1@gmail.com`;
    
    // Senha provisória é o CPF completo (mínimo de 6 dígitos garantido por CPF de 11 números)
    // Se o CPF estiver em branco por algum motivo, usamos uma senha padrão temporária
    const password = cleanCpf || 'Nexora123!'; 

    console.log(`⏳ Criando Auth para: ${u.name} (${email})...`);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: u.name,
          username: u.username,
          cpf: cleanCpf,
          houseNumber: String(u.houseNumber || ''),
          phone: u.phone || '',
          role: u.role ? u.role.toUpperCase() : 'MORADOR'
        }
      }
    });

    if (signUpError) {
      // Se o usuário já existir (ex: rodou o script pela segunda vez), tenta buscar o ID existente
      if (signUpError.message.includes("already registered") || signUpError.message.includes("already exists")) {
        console.log(`   ℹ️ Usuário já cadastrado no Auth. Buscando ID na tabela pública profiles...`);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', u.username)
          .single();
          
        if (profileData) {
          userMap[u.id] = profileData.id;
          console.log(`   ✅ ID Mapeado (Existente): ${u.id} -> ${profileData.id}`);
        } else {
          console.error(`   ❌ Falha ao encontrar perfil para usuário já existente: ${u.username}`);
        }
      } else {
        console.error(`   ❌ Erro ao criar Auth para ${u.name}:`, signUpError.message);
      }
      continue;
    }

    if (signUpData.user) {
      const newId = signUpData.user.id;
      userMap[u.id] = newId;
      console.log(`   ✅ Criado com sucesso! ID Mapeado: ${u.id} -> ${newId}`);
      
      // Sincroniza tokens de push se existirem no Firestore
      if (u.fcmToken || (u.fcmTokens && u.fcmTokens.length > 0)) {
        const tokensToSave = new Set();
        if (u.fcmToken) tokensToSave.add(u.fcmToken);
        if (u.fcmTokens) u.fcmTokens.forEach(t => tokensToSave.add(t));
        
        for (const token of tokensToSave) {
          await supabase.from('user_push_tokens').insert({
            user_id: newId,
            token: token
          });
        }
      }
    }
  }

  // B. Migrar Quadro de Avisos (Notices)
  console.log("\n📌 Migrando Quadro de Avisos...");
  for (const notice of noticesList) {
    console.log(`⏳ Migrando aviso: "${notice.title}"...`);
    const { data: newNotice, error: noticeError } = await supabase
      .from('notices')
      .insert({
        title: notice.title,
        content: notice.content,
        created_at: notice.createdAt || new Date().toISOString()
      })
      .select()
      .single();

    if (noticeError) {
      console.error(`   ❌ Erro ao migrar aviso:`, noticeError.message);
      continue;
    }

    // Salvar curtidas e descurtidas (notice_reactions)
    if (notice.likes && Array.isArray(notice.likes)) {
      for (const oldUserId of notice.likes) {
        const newUserId = userMap[oldUserId];
        if (newUserId) {
          await supabase.from('notice_reactions').insert({
            notice_id: newNotice.id,
            user_id: newUserId,
            type: 'like'
          });
        }
      }
    }
    if (notice.dislikes && Array.isArray(notice.dislikes)) {
      for (const oldUserId of notice.dislikes) {
        const newUserId = userMap[oldUserId];
        if (newUserId) {
          await supabase.from('notice_reactions').insert({
            notice_id: newNotice.id,
            user_id: newUserId,
            type: 'dislike'
          });
        }
      }
    }
    console.log(`   ✅ Aviso migrado com sucesso.`);
  }

  // C. Migrar Documentos (Documents)
  console.log("\n📁 Migrando Central de Documentos...");
  for (const doc of documentsList) {
    console.log(`⏳ Migrando documento: "${doc.title}"...`);
    const { error: docError } = await supabase
      .from('documents')
      .insert({
        title: doc.title,
        description: doc.description || '',
        file_url: doc.fileUrl,
        is_pinned: !!doc.isPinned,
        created_at: doc.createdAt || new Date().toISOString()
      });

    if (docError) {
      console.error(`   ❌ Erro ao migrar documento:`, docError.message);
    } else {
      console.log(`   ✅ Documento migrado.`);
    }
  }

  // D. Migrar Reservas (Reservations)
  console.log("\n📅 Migrando Reservas...");
  for (const res of reservationsList) {
    const newUserId = userMap[res.userId];
    if (!newUserId) {
      console.warn(`   ⚠️ Ignorando reserva da área "${res.area}" para o dia ${res.date} porque o usuário não foi migrado.`);
      continue;
    }

    // Mapear área do Firestore para formato aceito no Supabase se necessário
    const { error: resError } = await supabase
      .from('reservations')
      .insert({
        user_id: newUserId,
        area: res.area,
        date: res.date,
        created_at: res.createdAt || new Date().toISOString()
      });

    if (resError) {
      console.error(`   ❌ Erro ao migrar reserva do dia ${res.date}:`, resError.message);
    } else {
      console.log(`   ✅ Reserva migrada para ${res.date} (${res.area}).`);
    }
  }

  // E. Migrar Ocorrências Privadas (Occurrences)
  console.log("\n🔒 Migrando Ocorrências Privadas...");
  for (const occ of occurrencesList) {
    const newUserId = userMap[occ.authorId];
    if (!newUserId) {
      console.warn(`   ⚠️ Ignorando ocorrência "${occ.subject}" porque o autor não foi migrado.`);
      continue;
    }

    const { error: occError } = await supabase
      .from('occurrences')
      .insert({
        author_id: newUserId,
        subject: occ.subject,
        description: occ.description,
        image_url: occ.photos && occ.photos.length > 0 ? occ.photos[0] : null,
        status: occ.status || 'Aberto',
        admin_response: occ.adminResponse || null,
        created_at: occ.createdAt || new Date().toISOString()
      });

    if (occError) {
      console.error(`   ❌ Erro ao migrar ocorrência "${occ.subject}":`, occError.message);
    } else {
      console.log(`   ✅ Ocorrência "${occ.subject}" migrada.`);
    }
  }

  // F. Migrar Votações e Votos (Votings & Votes)
  console.log("\n🗳️ Migrando Votações e Votos...");
  for (const voting of votingsList) {
    console.log(`⏳ Migrando votação: "${voting.title}"...`);
    
    // Mapear opções para formato compatível JSONB
    const formattedOptions = (voting.options || []).map(opt => ({
      id: opt.id,
      text: opt.text,
      imageUrl: opt.imageUrl || null
    }));

    const { data: newVoting, error: votingError } = await supabase
      .from('votings')
      .insert({
        title: voting.title,
        description: voting.description,
        options: formattedOptions,
        start_date: voting.startDate,
        end_date: voting.endDate,
        created_at: voting.createdAt || new Date().toISOString()
      })
      .select()
      .single();

    if (votingError) {
      console.error(`   ❌ Erro ao migrar votação:`, votingError.message);
      continue;
    }

    // Migrar votos individuais associados a esta votação
    if (voting.votes && Array.isArray(voting.votes)) {
      for (const vote of voting.votes) {
        const newUserId = userMap[vote.userId];
        if (!newUserId) continue;

        await supabase
          .from('votes')
          .insert({
            voting_id: newVoting.id,
            user_id: newUserId,
            option_ids: vote.optionIds || [],
            timestamp: vote.timestamp || new Date().toISOString()
          });
      }
    }
    console.log(`   ✅ Votação e votos migrados.`);
  }

  // G. Migrar Sugestões / Ocorrências Públicas e Comentários (Requests & Comments)
  console.log("\n📢 Migrando Sugestões Públicas e Comentários...");
  const requestMap = {}; // Mapeamento de id do request antigo para novo id do request

  for (const req of requestsList) {
    const newUserId = userMap[req.authorId];
    if (!newUserId) {
      console.warn(`   ⚠️ Ignorando sugestão "${req.title}" porque o autor não foi migrado.`);
      continue;
    }

    // Converter status para enum compatível
    let status = 'PENDENTE';
    const oldStatus = String(req.status).toUpperCase();
    if (oldStatus.includes('PENDENTE')) status = 'PENDENTE';
    else if (oldStatus.includes('ANDAMENTO')) status = 'EM_ANDAMENTO';
    else if (oldStatus.includes('APROVADA') || oldStatus.includes('CONCLUIDO')) status = 'RESOLVIDO';
    else if (oldStatus.includes('RECUSADA')) status = 'REJEITADO';

    const { data: newRequest, error: reqError } = await supabase
      .from('requests')
      .insert({
        title: req.title,
        description: req.description,
        author_id: newUserId,
        status: status,
        admin_response: req.adminResponse || null,
        created_at: req.createdAt || new Date().toISOString(),
        status_updated_at: req.statusUpdatedAt || null
      })
      .select()
      .single();

    if (reqError) {
      console.error(`   ❌ Erro ao migrar sugestão "${req.title}":`, reqError.message);
      continue;
    }

    requestMap[req.id] = newRequest.id;

    // Migrar curtidas (request_likes)
    if (req.likes && Array.isArray(req.likes)) {
      for (const oldUserId of req.likes) {
        const newUserId = userMap[oldUserId];
        if (newUserId) {
          await supabase.from('request_likes').insert({
            request_id: newRequest.id,
            user_id: newUserId
          });
        }
      }
    }

    // Migrar comentários associados
    if (req.comments && Array.isArray(req.comments)) {
      for (const com of req.comments) {
        const commentAuthorId = userMap[com.authorId];
        if (!commentAuthorId) continue;

        const { data: newComment } = await supabase
          .from('comments')
          .insert({
            request_id: newRequest.id,
            author_id: commentAuthorId,
            text: com.text,
            type: com.type || 'common',
            new_status: com.newStatus || null,
            created_at: com.createdAt || new Date().toISOString()
          })
          .select()
          .single();

        // Salvar curtidas em comentários (comment_likes)
        if (newComment && com.likes && Array.isArray(com.likes)) {
          for (const oldCommentLikeUserId of com.likes) {
            const newCommentLikeUserId = userMap[oldCommentLikeUserId];
            if (newCommentLikeUserId) {
              await supabase.from('comment_likes').insert({
                comment_id: newComment.id,
                user_id: newCommentLikeUserId
              });
            }
          }
        }
      }
    }
    console.log(`   ✅ Sugestão "${req.title}" e seus comentários migrados.`);
  }

  // H. Migrar Notificações (Notifications)
  console.log("\n🔔 Migrando Notificações...");
  for (const notif of notificationsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))) {
    const isGlobal = notif.userId === 'all';
    const newUserId = isGlobal ? null : userMap[notif.userId];
    const newRequestId = notif.requestId ? requestMap[notif.requestId] : null;

    if (!isGlobal && !newUserId) continue;

    const { data: newNotif, error: notifError } = await supabase
      .from('notifications')
      .insert({
        message: notif.message,
        user_id: newUserId,
        request_id: newRequestId,
        created_at: notif.createdAt || new Date().toISOString()
      })
      .select()
      .single();

    if (notifError) {
      console.error(`   ❌ Erro ao migrar notificação:`, notifError.message);
      continue;
    }

    // Migrar lidos (notification_reads)
    if (newNotif && notif.readBy && Array.isArray(notif.readBy)) {
      for (const oldReadUserId of notif.readBy) {
        const newReadUserId = userMap[oldReadUserId];
        if (newReadUserId) {
          await supabase.from('notification_reads').insert({
            notification_id: newNotif.id,
            user_id: newReadUserId
          });
        }
      }
    }
  }

  console.log(`\n====================================================`);
  console.log(`🎉 PROCESSAMENTO DE MIGRAÇÃO CONCLUÍDO COM SUCESSO!`);
  console.log(`====================================================\n`);
}

migrate().catch(err => {
  console.error("\n❌ ERRO FATAL NA MIGRAÇÃO:", err);
});
