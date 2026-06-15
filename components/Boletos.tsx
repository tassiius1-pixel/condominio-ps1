import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Role, View, Boleto, User } from '../types';
import {
  BoletoIcon,
  DownloadIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
  ChevronLeftIcon,
  FileIcon,
  InfoIcon,
} from './Icons';
import JSZip from 'jszip';
import { supabase } from '../services/supabase';
import { sendPushNotification } from '../services/pushNotifications';
import { loadPdfJS } from '../utils/scriptLoader';

interface BoletosProps {
  setView: (view: View) => void;
}

interface ProcessedFile {
  name: string;
  type: 'boleto' | 'balancete' | 'ignored';
  houseNumber?: number;
  originalHouseNumber?: number;
  matchedUser?: User;
  blob: Blob;
  size: number;
  recognizedCpf?: string;
  confidence: 'high' | 'medium' | 'none';
  error?: string;
}


export const Boletos: React.FC<BoletosProps> = ({ setView }) => {
  const {
    boletos,
    users,
    addBoletos,
    deleteBoletosByMonth,
    getBoletoSignedUrl,
    addDocument,
    addToast,
    loading: dataLoading,
    boletoUploads,
    addBoletoUpload
  } = useData();

  const { currentUser } = useAuth();
  const isManagement = currentUser && [Role.ADMIN, Role.SINDICO, Role.SUBSINDICO].includes(currentUser.role);

  // Estados do Componente
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [refMonth, setRefMonth] = useState(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`; // YYYY-MM
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'confirm' | 'report'>('upload');

  // Estados de Upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');

  // Estado para exclusão
  const [deletingMonth, setDeletingMonth] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para Gerenciamento Individual por Unidade
  const [activeManagementMonth, setActiveManagementMonth] = useState<string | null>(null);
  const [houseSearchQuery, setHouseSearchQuery] = useState('');
  const [isUploadingIndividual, setIsUploadingIndividual] = useState(false);
  const [uploadingHouseNumber, setUploadingHouseNumber] = useState<number | null>(null);

  // Relatório Final
  const [reportData, setReportData] = useState<{
    total: number;
    delivered: number;
    stored: number;
    hasBalancete: boolean;
    deliveredList: { house: number; name: string; username: string; fileName: string }[];
    storedList: { house: number; name: string; fileName: string }[];
  } | null>(null);

  // Formata o mês de referência de YYYY-MM para "Mês de YYYY"
  const formatMonthName = (monthStr: string) => {
    if (!monthStr || !monthStr.includes('-')) return monthStr;
    const [year, month] = monthStr.split('-');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthIndex = parseInt(month, 10) - 1;
    return `${months[monthIndex]} de ${year}`;
  };

  // Filtrar boletos do morador
  const myBoletos = useMemo(() => {
    if (!currentUser) return [];
    return boletos.filter(b => b.houseNumber === currentUser.houseNumber);
  }, [boletos, currentUser]);



  // Associação manual de boleto a uma casa no Preview de Confirmação
  const handleManualHouseAssociation = (idx: number, value: string) => {
    setProcessedFiles(prev => {
      const next = [...prev];
      const target = { ...next[idx] };
      
      if (value === 'ignore') {
        target.type = 'ignored';
        target.houseNumber = undefined;
        target.matchedUser = undefined;
        target.confidence = 'none';
      } else if (value === '') {
        target.type = 'boleto';
        target.houseNumber = undefined;
        target.matchedUser = undefined;
        target.confidence = 'none';
      } else {
        const houseNum = parseInt(value, 10);
        target.type = 'boleto';
        target.houseNumber = houseNum;
        // Procurar o morador associado correspondente no banco
        target.matchedUser = users.find(u => u.houseNumber === houseNum);
        target.confidence = 'medium'; // Atribuído manualmente assume média confiança
      }
      
      next[idx] = target;
      return next;
    });
  };

  // Processar o arquivo ZIP selecionado
  const handleProcessZip = async () => {
    if (!selectedFile) {
      addToast('Por favor, selecione um arquivo ZIP.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(selectedFile);
      const tempProcessed: ProcessedFile[] = [];

      // Carrega o PDF.js dinamicamente antes do processamento
      let pdfjsLib: any = null;
      try {
        pdfjsLib = await loadPdfJS();
      } catch (pdfjsErr) {
        console.error('Erro ao carregar o PDF.js. Fallback para nomes de arquivos ativo.', pdfjsErr);
      }

      // Loop assíncrono sobre cada arquivo no zip
      const promises: Promise<void>[] = [];
      loadedZip.forEach((relativePath, file) => {
        if (file.dir || !relativePath.toLowerCase().endsWith('.pdf')) return;

        const promise = (async () => {
          const contentBlob = await file.async('blob');
          const fileName = file.name;
          const fileSize = contentBlob.size;

          // Verificar se é Balancete
          if (fileName.toUpperCase().includes('BALANCETE')) {
            tempProcessed.push({
              name: fileName,
              type: 'balancete',
              blob: contentBlob,
              size: fileSize,
              confidence: 'none'
            });
            return;
          }

          let extractedText = '';
          let textLoadSuccess = false;

          // Extração de texto usando PDF.js se carregado
          if (pdfjsLib) {
            try {
              const arrayBuffer = await contentBlob.arrayBuffer();
              const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
              const pdfDoc = await loadingTask.promise;
              
              if (pdfDoc.numPages > 0) {
                const page = await pdfDoc.getPage(1);
                const textContent = await page.getTextContent();
                extractedText = textContent.items.map((item: any) => item.str).join(' ');
                textLoadSuccess = true;
              }
            } catch (pdfReadErr) {
              console.error(`Erro ao extrair texto do PDF ${fileName}:`, pdfReadErr);
            }
          }

          // Variáveis de identificação
          let matchedUser: User | undefined = undefined;
          let confidence: 'high' | 'medium' | 'none' = 'none';
          let recognizedCpf = '';
          let houseNumber: number | undefined = undefined;

          // Se extraiu texto do PDF, tenta casar por CPF e Casa no texto
          if (textLoadSuccess && extractedText) {
            const cleanCPF = (cpf: string) => cpf.replace(/\D/g, '');
            const textCleanedForCpf = extractedText.replace(/\D/g, '');

            // 1. Match por CPF (Alta Confiança)
            for (const u of users) {
              if (u.cpf) {
                const uCpfClean = cleanCPF(u.cpf);
                if (uCpfClean.length === 11) {
                  const formattedCpf = u.cpf;
                  if (textCleanedForCpf.includes(uCpfClean) || extractedText.includes(formattedCpf)) {
                    matchedUser = u;
                    recognizedCpf = u.cpf;
                    houseNumber = u.houseNumber;
                    confidence = 'high';
                    break;
                  }
                }
              }
            }

            // 2. Se não casou por CPF, busca padrão de Casa no texto do PDF
            if (!matchedUser) {
              const regexes = [
                /casa\s+0*(\d+)/i,
                /casa\s*-\s*0*(\d+)/i,
                /unidade\s+0*(\d+)/i,
                /casa\s+n[ºo\.]\s*0*(\d+)/i,
                /casa\s+n[úu]mero\s*0*(\d+)/i,
                /residente\s+na\s+casa\s+0*(\d+)/i
              ];

              for (const regex of regexes) {
                const match = extractedText.match(regex);
                if (match) {
                  const num = parseInt(match[1], 10);
                  const foundUser = users.find(u => u.houseNumber === num);
                  houseNumber = num;
                  matchedUser = foundUser;
                  confidence = 'medium';
                  break;
                }
              }
            }
          }

          // 3. Fallback: Se não identificou por CPF/Texto, tenta pelo padrão de nome de arquivo
          if (!matchedUser && houseNumber === undefined) {
            const houseMatch = fileName.match(/^CASA\s+0*(\d+)/i);
            if (houseMatch) {
              const num = parseInt(houseMatch[1], 10);
              const foundUser = users.find(u => u.houseNumber === num);
              houseNumber = num;
              matchedUser = foundUser;
              confidence = 'medium';
            }
          }

          if (houseNumber !== undefined) {
            tempProcessed.push({
              name: fileName,
              type: 'boleto',
              houseNumber,
              originalHouseNumber: houseNumber,
              matchedUser,
              blob: contentBlob,
              size: fileSize,
              recognizedCpf: recognizedCpf || undefined,
              confidence
            });
          } else {
            tempProcessed.push({
              name: fileName,
              type: 'ignored',
              blob: contentBlob,
              size: fileSize,
              confidence: 'none'
            });
          }
        })();

        promises.push(promise);
      });

      await Promise.all(promises);

      // Ordenar por tipo e casa para o preview ficar elegante
      tempProcessed.sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        if (a.houseNumber && b.houseNumber) return a.houseNumber - b.houseNumber;
        return a.name.localeCompare(b.name);
      });

      setProcessedFiles(tempProcessed);
      setCurrentStep('confirm');
    } catch (error) {
      console.error('Erro ao ler arquivo ZIP:', error);
      addToast('Erro ao processar o arquivo ZIP. Verifique se é um arquivo válido.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Executar o Upload e Distribuição dos Boletos
  const handleConfirmAndUpload = async () => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatusText('Iniciando envio dos boletos...');

    try {
      const activeBoletos = processedFiles.filter(f => f.type === 'boleto');
      const balanceteFile = processedFiles.find(f => f.type === 'balancete');
      const totalSteps = activeBoletos.length + (balanceteFile ? 1 : 0);
      let completedSteps = 0;

      // 1. Verificar se já há boletos para esse mês de referência e deletar se houver (Regra de Reupload: Substituir)
      const hasExisting = boletos.some(b => b.referenceMonth === refMonth);
      if (hasExisting) {
        setUploadStatusText(`Substituindo boletos antigos de ${formatMonthName(refMonth)}...`);
        await deleteBoletosByMonth(refMonth);
      }

      const boletosToInsert: Omit<Boleto, 'id' | 'createdAt'>[] = [];
      const usersToNotify: { user: User; fileName: string }[] = [];
      const storedReport: { house: number; name: string; fileName: string }[] = [];

      // 2. Upload de cada boleto para o Supabase Storage e registro
      for (const pFile of activeBoletos) {
        if (!pFile.houseNumber) continue;

        setUploadStatusText(`Enviando boleto da Casa ${pFile.houseNumber}...`);

        // Caminho do arquivo no bucket boletos
        const storagePath = `${refMonth}/casa_${String(pFile.houseNumber).padStart(2, '0')}.pdf`;

        // Upload para o Storage
        const { error: uploadError } = await supabase.storage
          .from('boletos')
          .upload(storagePath, pFile.blob, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (uploadError) {
          console.error(`Erro ao enviar boleto Casa ${pFile.houseNumber}:`, uploadError);
          // Continua mesmo com erro em um boleto individual para não travar o lote inteiro
          continue;
        }

        // Criar registro do boleto
        boletosToInsert.push({
          houseNumber: pFile.houseNumber,
          referenceMonth: refMonth,
          fileUrl: storagePath, // Salva o path do storage no banco
          fileName: pFile.name,
          fileSize: pFile.size,
          uploadedBy: currentUser?.id || ''
        });

        // Registrar moradores com match e sem match para o relatório final
        if (pFile.matchedUser) {
          usersToNotify.push({
            user: pFile.matchedUser,
            fileName: pFile.name
          });
        } else {
          // Extrair o nome do morador a partir do nome do arquivo (ex: "CASA 02 JOSEANE XAVIER.pdf" -> "JOSEANE XAVIER")
          const namePart = pFile.name
            .replace(/^CASA\s+\d+\s*/i, '') // Remove o CASA XX
            .replace(/\.pdf$/i, '')          // Remove a extensão
            .trim();
          storedReport.push({
            house: pFile.houseNumber,
            name: namePart || 'Morador não cadastrado',
            fileName: pFile.name
          });
        }

        completedSteps++;
        setUploadProgress(Math.round((completedSteps / totalSteps) * 100));
      }

      // Inserir todos no banco em lote
      if (boletosToInsert.length > 0) {
        await addBoletos(boletosToInsert);

        // Registrar log de upload histórico
        try {
          await addBoletoUpload({
            referenceMonth: refMonth,
            uploadedBy: currentUser?.id || '',
            fileName: selectedFile?.name || 'lote_boletos.zip',
            fileSize: selectedFile?.size || 0,
            totalFiles: activeBoletos.length,
            matchedFiles: usersToNotify.length
          });
        } catch (uploadLogErr) {
          console.error("Erro ao registrar log de upload histórico:", uploadLogErr);
        }
      }

      // 3. Processar Balancete se houver
      if (balanceteFile) {
        setUploadStatusText('Enviando balancete financeiro...');
        
        // Caminho do balancete no bucket de documentos (que é público para gestão)
        const storagePath = `documents/balancetes/balancete_${refMonth}_${Date.now()}.pdf`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, balanceteFile.blob, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('documents')
            .getPublicUrl(storagePath);

          // Salvar como documento na categoria Financeiro
          await addDocument({
            title: `Balancete Financeiro - ${formatMonthName(refMonth)}`,
            description: `Relatório do balancete mensal referente a ${formatMonthName(refMonth)}.`,
            category: 'Financeiro',
            fileUrl: publicUrlData.publicUrl,
            fileName: balanceteFile.name,
            fileType: 'pdf',
            fileSize: balanceteFile.size,
            uploadedBy: currentUser?.id || '',
            isPinned: false
          });
        } else {
          console.error("Erro ao enviar balancete ao storage:", uploadError);
        }

        completedSteps++;
        setUploadProgress(Math.round((completedSteps / totalSteps) * 100));
      }

      // 4. Enviar notificações Push para moradores cadastrados
      setUploadStatusText('Enviando notificações push para moradores...');
      for (const item of usersToNotify) {
        try {
          // Envia push notification
          sendPushNotification(
            item.user.id,
            'Novo Boleto Disponível',
            `O boleto de ${formatMonthName(refMonth)} da sua casa já está disponível no app.`
          );

          // Também cria notificação local no banco (via Supabase diretamente)
          await supabase.from('notifications').insert({
            user_id: item.user.id,
            message: `O boleto do mês ${formatMonthName(refMonth)} já está disponível para download.`,
            request_id: null
          });
        } catch (pushErr) {
          console.error(`Erro ao notificar morador casa ${item.user.houseNumber}:`, pushErr);
        }
      }

      // 5. Estruturar dados do relatório final
      setReportData({
        total: activeBoletos.length,
        delivered: usersToNotify.length,
        stored: storedReport.length,
        hasBalancete: !!balanceteFile,
        deliveredList: usersToNotify.map(n => ({
          house: n.user.houseNumber,
          name: n.user.name,
          username: n.user.username,
          fileName: n.fileName
        })),
        storedList: storedReport
      });

      setCurrentStep('report');
      addToast('Boletos distribuídos com sucesso!', 'success');
    } catch (err) {
      console.error('Erro geral no upload do lote:', err);
      addToast('Ocorreu um erro ao concluir a distribuição dos boletos.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Excluir lote completo de um mês do histórico
  const handleDeleteMonthLote = async () => {
    if (!deletingMonth) return;
    setIsDeleting(true);
    try {
      await deleteBoletosByMonth(deletingMonth);
      setDeletingMonth(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Enviar ou substituir boleto individualmente para uma casa específica
  const handleUploadIndividualBoleto = async (houseNumber: number, file: File) => {
    if (!activeManagementMonth) return;
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      addToast('Por favor, selecione um arquivo PDF.', 'error');
      return;
    }

    setIsUploadingIndividual(true);
    setUploadingHouseNumber(houseNumber);

    try {
      const storagePath = `${activeManagementMonth}/casa_${String(houseNumber).padStart(2, '0')}.pdf`;

      // Upload para o Storage (sobrescreve se já existir devido ao upsert: true)
      const { error: uploadError } = await supabase.storage
        .from('boletos')
        .upload(storagePath, file, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Verifica se o boleto já existe cadastrado no banco de dados para esse mês
      const existingBoleto = boletos.find(
        b => b.referenceMonth === activeManagementMonth && b.houseNumber === houseNumber
      );

      if (existingBoleto) {
        // Atualiza o registro existente
        const { error: dbError } = await supabase
          .from('boletos')
          .update({
            file_name: file.name,
            file_size: file.size,
            uploaded_by: currentUser?.id || '',
            created_at: new Date().toISOString()
          })
          .eq('id', existingBoleto.id);

        if (dbError) throw dbError;
        addToast(`Boleto da Casa ${houseNumber} atualizado com sucesso!`, 'success');
      } else {
        // Insere um novo registro de boleto
        const { error: dbError } = await supabase
          .from('boletos')
          .insert({
            house_number: houseNumber,
            reference_month: activeManagementMonth,
            file_url: storagePath,
            file_name: file.name,
            file_size: file.size,
            uploaded_by: currentUser?.id || ''
          });

        if (dbError) throw dbError;
        addToast(`Boleto da Casa ${houseNumber} enviado com sucesso!`, 'success');
      }

      const matchedUser = users.find(u => u.houseNumber === houseNumber);

      // Registrar log de upload histórico para o envio individual
      try {
        await addBoletoUpload({
          referenceMonth: activeManagementMonth,
          uploadedBy: currentUser?.id || '',
          fileName: file.name,
          fileSize: file.size,
          totalFiles: 1,
          matchedFiles: matchedUser ? 1 : 0
        });
      } catch (uploadLogErr) {
        console.error("Erro ao registrar log de upload histórico individual:", uploadLogErr);
      }

      // Notifica o morador da unidade se ele estiver cadastrado no app
      if (matchedUser) {
        try {
          sendPushNotification(
            matchedUser.id,
            'Novo Boleto Disponível',
            `O boleto de ${formatMonthName(activeManagementMonth)} da sua casa foi enviado ou atualizado no app.`
          );

          await supabase.from('notifications').insert({
            user_id: matchedUser.id,
            message: `O boleto do mês ${formatMonthName(activeManagementMonth)} foi atualizado e está disponível para download.`,
            request_id: null
          });
        } catch (pushErr) {
          console.error(`Erro ao notificar morador casa ${houseNumber}:`, pushErr);
        }
      }

    } catch (err: any) {
      console.error('Erro no upload individual:', err);
      addToast(`Erro ao enviar boleto: ${err.message || 'Erro desconhecido'}`, 'error');
    } finally {
      setIsUploadingIndividual(false);
      setUploadingHouseNumber(null);
    }
  };

  // Excluir um boleto individualmente
  const handleDeleteIndividualBoleto = async (boletoToDel: Boleto) => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente o boleto de ${formatMonthName(boletoToDel.referenceMonth)} da Casa ${boletoToDel.houseNumber}?`)) {
      return;
    }

    try {
      // Deleta arquivo físico do storage
      const { error: storageError } = await supabase.storage
        .from('boletos')
        .remove([boletoToDel.fileUrl]);

      if (storageError) {
        console.warn('Erro ao remover do storage (continuando para deletar do banco):', storageError);
      }

      // Deleta do Banco de dados
      const { error: dbError } = await supabase
        .from('boletos')
        .delete()
        .eq('id', boletoToDel.id);

      if (dbError) throw dbError;

      addToast(`Boleto da Casa ${boletoToDel.houseNumber} excluído com sucesso!`, 'success');
    } catch (err: any) {
      console.error('Erro ao excluir boleto:', err);
      addToast(`Erro ao excluir boleto: ${err.message || 'Erro desconhecido'}`, 'error');
    }
  };

  // Reenviar notificação de boleto de forma individual
  const handleNotifyIndividual = async (houseNumber: number) => {
    if (!activeManagementMonth) return;
    
    const matchedUser = users.find(u => u.houseNumber === houseNumber);
    if (!matchedUser) {
      addToast('Não há moradores cadastrados nesta casa para notificar.', 'info');
      return;
    }

    try {
      sendPushNotification(
        matchedUser.id,
        'Lembrete de Boleto Disponível',
        `Aviso: O boleto condominial de ${formatMonthName(activeManagementMonth)} da Casa ${houseNumber} está disponível.`
      );

      await supabase.from('notifications').insert({
        user_id: matchedUser.id,
        message: `Lembrete: O boleto do mês ${formatMonthName(activeManagementMonth)} está disponível para download.`,
        request_id: null
      });

      addToast(`Notificação reenviada com sucesso para ${matchedUser.name}!`, 'success');
    } catch (err: any) {
      console.error('Erro ao reenviar notificação:', err);
      addToast('Erro ao reenviar notificação.', 'error');
    }
  };

  // Download ou Visualização do Boleto do Morador
  const handleOpenBoleto = async (boleto: Boleto, downloadDirectly = false) => {
    try {
      const signedUrl = await getBoletoSignedUrl(boleto.fileUrl);
      if (!signedUrl) {
        addToast('Não foi possível gerar o link seguro do boleto.', 'error');
        return;
      }

      if (downloadDirectly) {
        // Forçar download via trigger de link
        const a = document.createElement('a');
        a.href = signedUrl;
        a.download = boleto.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // Abrir em nova aba para visualização
        window.open(signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Erro ao acessar boleto:', error);
      addToast('Erro ao acessar o boleto.', 'error');
    }
  };

  // Exportar relatório de envio para impressão nativa em PDF
  const handleExportReport = () => {
    if (!reportData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast('Erro ao abrir tela de impressão. Verifique se o bloqueador de popups está ativo.', 'error');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Envio de Boletos - ${formatMonthName(refMonth)}</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            color: #1a202c;
            padding: 40px;
            background-color: #fff;
          }
          .header {
            border-bottom: 2px solid #edf2f7;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .title {
            font-size: 24px;
            font-weight: 700;
            color: #2d3748;
            margin: 0 0 5px 0;
          }
          .subtitle {
            font-size: 14px;
            color: #718096;
            margin: 0;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 35px;
          }
          .card {
            background-color: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
          }
          .card-value {
            font-size: 28px;
            font-weight: 800;
            color: #2b6cb0;
          }
          .card-label {
            font-size: 12px;
            font-weight: 600;
            color: #4a5568;
            margin-top: 5px;
          }
          .section-title {
            font-size: 16px;
            font-weight: 700;
            color: #2d3748;
            border-bottom: 1px solid #edf2f7;
            padding-bottom: 8px;
            margin-top: 30px;
            margin-bottom: 15px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          th {
            background-color: #edf2f7;
            color: #4a5568;
            font-weight: 600;
            text-align: left;
            padding: 10px;
            border: 1px solid #e2e8f0;
          }
          td {
            padding: 10px;
            border: 1px solid #e2e8f0;
          }
          tr:nth-child(even) {
            background-color: #fafdff;
          }
          .badge-green {
            background-color: #c6f6d5;
            color: #22543d;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 600;
          }
          .badge-yellow {
            background-color: #fefcbf;
            color: #744210;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 600;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 11px;
            color: #a0aec0;
            border-top: 1px solid #edf2f7;
            padding-top: 15px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">Relatório de Distribuição de Boletos</h1>
          <p class="subtitle">Mês de Referência: ${formatMonthName(refMonth)} | Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
        </div>

        <div class="summary-grid">
          <div class="card">
            <div class="card-value">${reportData.total}</div>
            <div class="card-label">Total Processado</div>
          </div>
          <div class="card">
            <div class="card-value" style="color: #2f855a;">${reportData.delivered}</div>
            <div class="card-label">Entregues com Sucesso</div>
          </div>
          <div class="card">
            <div class="card-value" style="color: #c05621;">${reportData.stored}</div>
            <div class="card-label">Armazenados p/ Cadastro Futuro</div>
          </div>
        </div>

        ${reportData.deliveredList.length > 0 ? `
          <div class="section-title">Boletos Entregues e Notificados (Moradores com Cadastro)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 80px;">Casa</th>
                <th>Nome do Morador</th>
                <th>Arquivo de Origem</th>
                <th>Usuário no App</th>
                <th style="width: 100px; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.deliveredList.map(item => `
                <tr>
                  <td>Casa ${String(item.house).padStart(2, '0')}</td>
                  <td>${item.name}</td>
                  <td style="font-family: monospace; font-size: 11px; color: #4a5568;">${item.fileName}</td>
                  <td>${item.username}</td>
                  <td style="text-align: center;"><span class="badge-green">Entregue</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${reportData.storedList.length > 0 ? `
          <div class="section-title">Boletos Armazenados (Moradores Sem Cadastro no App)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 80px;">Casa</th>
                <th>Nome Extraído do Arquivo</th>
                <th>Arquivo de Origem</th>
                <th style="width: 150px; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.storedList.map(item => `
                <tr>
                  <td>Casa ${String(item.house).padStart(2, '0')}</td>
                  <td>${item.name}</td>
                  <td style="font-family: monospace; font-size: 11px; color: #4a5568;">${item.fileName}</td>
                  <td style="text-align: center;"><span class="badge-yellow">Aguardando Cadastro</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${reportData.hasBalancete ? `
          <div class="section-title" style="margin-top: 25px;">Documento Financeiro Detectado</div>
          <div style="background-color: #ebf8ff; border: 1px solid #bee3f8; border-radius: 6px; padding: 12px; font-size: 13px; color: #2b6cb0;">
            ✅ <strong>Balancete Financeiro do Mês</strong> foi enviado com sucesso e disponibilizado publicamente na aba de <strong>Documentos > Financeiro</strong> para todos os condôminos.
          </div>
        ` : ''}

        <div class="footer">
          Condomínio Porto Seguro I - Nexora Flow System | Este relatório serve como comprovante eletrônico de processamento de boletos.
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    // Pequeno delay para garantir que renderizou no browser antes de chamar a tela de impressão
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleCloseModal = () => {
    if (isUploading) return;
    setIsUploadModalOpen(false);
    setSelectedFile(null);
    setProcessedFiles([]);
    setCurrentStep('upload');
    setUploadProgress(0);
  };

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 min-h-screen p-4 sm:p-6 transition-colors duration-200">
      
      {/* Título Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BoletoIcon className="text-blue-500 w-8 h-8" />
            Boletos Mensais
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isManagement
              ? 'Área da Gestão: Faça upload do lote ZIP para distribuição automática de boletos.'
              : 'Acesse de forma rápida e segura o boleto mensal de taxa condominial da sua unidade.'}
          </p>
        </div>

        {isManagement && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all"
          >
            <PlusIcon className="w-5 h-5" />
            Enviar Boletos (ZIP)
          </button>
        )}
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-6xl mx-auto">
        {isManagement ? (
          /* ======================================================= */
          /* VISÃO DA GESTÃO: HISTÓRICO DE LOTES ENVIADOS            */
          /* ======================================================= */
          <div className="space-y-6">
            {activeManagementMonth ? (
              /* ======================================================= */
              /* PAINEL DE GERENCIAMENTO INDIVIDUAL DE BOLETOS POR UNIDADE*/
              /* ======================================================= */
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-6">
                
                {/* Cabeçalho do Painel */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setActiveManagementMonth(null);
                        setHouseSearchQuery('');
                      }}
                      className="p-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0"
                      title="Voltar para histórico de meses"
                    >
                      <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        Gerenciar Unidades — {formatMonthName(activeManagementMonth)}
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Envie, substitua, delete ou notifique os boletos individuais de cada casa do condomínio.
                      </p>
                    </div>
                  </div>

                  {/* Input de Busca */}
                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Buscar por número da casa..."
                      value={houseSearchQuery}
                      onChange={(e) => setHouseSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors"
                    />
                  </div>
                </div>

                {/* Grid/Lista de Casas */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 105 }, (_, i) => i + 1)
                    .filter((houseNum) => {
                      if (!houseSearchQuery.trim()) return true;
                      return String(houseNum).includes(houseSearchQuery.trim());
                    })
                    .map((houseNum) => {
                      // Moradores cadastrados na casa
                      const matchedUsers = users.filter((u) => u.houseNumber === houseNum);
                      const hasRegisteredUser = matchedUsers.length > 0;

                      // Boleto correspondente
                      const boleto = boletos.find(
                        (b) => b.referenceMonth === activeManagementMonth && b.houseNumber === houseNum
                      );

                      const isThisHouseUploading = uploadingHouseNumber === houseNum && isUploadingIndividual;

                      return (
                        <div
                          key={houseNum}
                          className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/10 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-sm transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2.5">
                              <span className="text-sm font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-0.5 rounded-lg">
                                Casa {String(houseNum).padStart(2, '0')}
                              </span>
                              {boleto ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/30 rounded-full">
                                  Boleto Enviado
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-full">
                                  Sem Boleto
                                </span>
                              )}
                            </div>

                            {/* Detalhes Morador */}
                            <div className="space-y-1 mb-4">
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                Morador(es):
                              </p>
                              {hasRegisteredUser ? (
                                <div className="space-y-1">
                                  {matchedUsers.map((u) => (
                                    <p key={u.id} className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                      👤 {u.name} <span className="text-gray-400 dark:text-gray-500 font-mono">(@{u.username})</span>
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 italic">
                                  Sem morador cadastrado no app
                                </p>
                              )}
                            </div>

                            {/* Detalhes Boleto se existir */}
                            {boleto && (
                              <div className="p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-800 text-xs mb-4 space-y-1">
                                <p className="font-bold text-gray-700 dark:text-gray-300 truncate" title={boleto.fileName}>
                                  📄 {boleto.fileName}
                                </p>
                                <p className="text-gray-500 dark:text-gray-400">
                                  Tamanho: {Math.round(boleto.fileSize / 1024)} KB
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Ações */}
                          <div className="border-t border-gray-200 dark:border-gray-800 pt-3 flex flex-wrap items-center gap-2">
                            {isThisHouseUploading ? (
                              <div className="w-full flex items-center justify-center gap-2 py-1.5 text-xs text-blue-600 font-semibold">
                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-600"></div>
                                Enviando...
                              </div>
                            ) : boleto ? (
                              <>
                                {/* Ações de visualizar e baixar */}
                                <button
                                  onClick={() => handleOpenBoleto(boleto, false)}
                                  className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors shrink-0"
                                  title="Visualizar boleto"
                                >
                                  <EyeIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenBoleto(boleto, true)}
                                  className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors shrink-0"
                                  title="Baixar boleto"
                                >
                                  <DownloadIcon className="w-4 h-4" />
                                </button>

                                {/* Notificar */}
                                <button
                                  onClick={() => handleNotifyIndividual(houseNum)}
                                  disabled={!hasRegisteredUser}
                                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 disabled:hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-lg transition-all shrink-0"
                                  title={hasRegisteredUser ? 'Reenviar notificação de boleto' : 'Sem morador cadastrado'}
                                >
                                  Notificar
                                </button>

                                {/* Substituir */}
                                <input
                                  type="file"
                                  accept=".pdf"
                                  id={`substitute-file-${houseNum}`}
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadIndividualBoleto(houseNum, file);
                                  }}
                                />
                                <label
                                  htmlFor={`substitute-file-${houseNum}`}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-lg cursor-pointer transition-all shrink-0"
                                >
                                  Substituir
                                </label>

                                {/* Excluir */}
                                <button
                                  onClick={() => handleDeleteIndividualBoleto(boleto)}
                                  className="p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0 ml-auto"
                                  title="Excluir boleto"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                {/* Enviar boleto individual do zero */}
                                <input
                                  type="file"
                                  accept=".pdf"
                                  id={`upload-file-${houseNum}`}
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadIndividualBoleto(houseNum, file);
                                  }}
                                />
                                <label
                                  htmlFor={`upload-file-${houseNum}`}
                                  className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-sm hover:shadow transition-all"
                                >
                                  <PlusIcon className="w-3.5 h-3.5" />
                                  Enviar PDF
                                </label>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                  Histórico de Envio por Mês
                </h2>

                {dataLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : boletoUploads.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BoletoIcon className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
                      Nenhum lote enviado
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 max-w-sm mx-auto">
                      Faça o upload do primeiro arquivo ZIP de boletos da contabilidade para iniciar a distribuição.
                    </p>
                  </div>
                                ) : (
                  <>
                    {/* Visualização Mobile: Cards empilhados */}
                    <div className="md:hidden space-y-4">
                      {boletoUploads.map((upload) => {
                        const isActive = boletos.some(b => b.referenceMonth === upload.referenceMonth);
                        return (
                          <div
                            key={upload.id}
                            className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 hover:shadow-md transition-all flex flex-col gap-4"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-base font-black text-gray-900 dark:text-white">
                                  {formatMonthName(upload.referenceMonth)}
                                </div>
                                <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                                  Enviado em: {new Date(upload.uploadedAt).toLocaleString('pt-BR')}
                                </div>
                              </div>
                              <div>
                                {isActive ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/30">
                                    Ativo
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-250 dark:border-gray-700">
                                    Arquivado
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="border-t border-b border-gray-100 dark:border-gray-800 py-3 space-y-2.5 text-xs">
                              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                                <span className="font-semibold text-gray-500 dark:text-gray-400">Total de boletos:</span>
                                <span className="font-black text-gray-800 dark:text-white">{upload.totalFiles} boletos</span>
                              </div>
                              <div className="flex justify-between items-center gap-4 text-gray-600 dark:text-gray-300">
                                <span className="font-semibold text-gray-500 dark:text-gray-400 shrink-0">Arquivo ZIP:</span>
                                <span className="font-mono text-right truncate max-w-[200px] text-gray-700 dark:text-gray-300" title={upload.fileName}>
                                  {upload.fileName}
                                </span>
                              </div>
                              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                                <span className="font-semibold text-gray-500 dark:text-gray-400">Tamanho:</span>
                                <span className="font-medium">{Math.round(upload.fileSize / 1024)} KB</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => isActive && setActiveManagementMonth(upload.referenceMonth)}
                                disabled={!isActive}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 disabled:hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                title={isActive ? "Gerenciar boletos individuais deste mês" : "Lote arquivado"}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
                                </svg>
                                Gerenciar
                              </button>
                              <button
                                onClick={() => isActive && setDeletingMonth(upload.referenceMonth)}
                                disabled={!isActive}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                title={isActive ? "Remover lote completo deste mês" : "Lote arquivado"}
                              >
                                <TrashIcon className="w-4 h-4" />
                                Excluir
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Visualização Desktop: Tabela clássica completa */}
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Mês de Referência
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Envio e Arquivo
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Status de Distribuição
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-800">
                          {boletoUploads.map((upload) => {
                            const isActive = boletos.some(b => b.referenceMonth === upload.referenceMonth);
                            return (
                              <tr key={upload.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-bold text-gray-800 dark:text-white">
                                    {formatMonthName(upload.referenceMonth)}
                                  </div>
                                  <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                    Enviado em: {new Date(upload.uploadedAt).toLocaleString('pt-BR')}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {upload.totalFiles} boletos
                                  </div>
                                  <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[200px] mx-auto" title={upload.fileName}>
                                    {upload.fileName} ({Math.round(upload.fileSize / 1024)} KB)
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  {isActive ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/40">
                                      Ativo (No Storage)
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                      Arquivado (Excluído)
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={() => isActive && setActiveManagementMonth(upload.referenceMonth)}
                                    disabled={!isActive}
                                    className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 disabled:opacity-30 disabled:hover:text-blue-500 p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors mr-2"
                                    title={isActive ? "Gerenciar boletos individuais deste mês" : "Lote arquivado. Não é possível gerenciar."}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => isActive && setDeletingMonth(upload.referenceMonth)}
                                    disabled={!isActive}
                                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 disabled:opacity-30 disabled:hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                    title={isActive ? "Remover lote completo deste mês" : "Lote arquivado. Já removido fisicamente."}
                                  >
                                    <TrashIcon className="w-5 h-5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ======================================================= */
          /* VISÃO DO MORADOR: LISTA DE BOLETOS DA SUA UNIDADE       */
          /* ======================================================= */
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                Boletos Recebidos da Unidade {currentUser ? String(currentUser.houseNumber).padStart(2, '0') : ''}
              </h2>
              <span className="text-xs font-semibold px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                Morador Autenticado
              </span>
            </div>

            {dataLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : myBoletos.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BoletoIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
                  Nenhum boleto disponível
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 max-w-xs mx-auto">
                  A administração ainda não disponibilizou boletos digitais para a sua unidade.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {myBoletos.map((boleto) => (
                  <div
                    key={boleto.id}
                    className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/40 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-md">
                          {formatMonthName(boleto.referenceMonth)}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {Math.round(boleto.fileSize / 1024)} KB
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {boleto.fileName}
                      </h4>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Disponibilizado em: {new Date(boleto.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-5 border-t border-gray-100 dark:border-gray-800/80 pt-3">
                      <button
                        onClick={() => handleOpenBoleto(boleto, false)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <EyeIcon className="w-4 h-4" />
                        Visualizar
                      </button>
                      <button
                        onClick={() => handleOpenBoleto(boleto, true)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <DownloadIcon className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================= */}
      {/* MODAL DE DELEÇÃO DE LOTE                                */}
      {/* ======================================================= */}
      {deletingMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 w-full max-w-md rounded-xl p-6 shadow-xl animate-fade-in">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Remover Lote de Boletos?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Você está prestes a remover permanentemente todos os <strong>{boletos.filter(b => b.referenceMonth === deletingMonth).length} boletos</strong> cadastrados para o mês de <strong>{formatMonthName(deletingMonth)}</strong>. 
              <br />
              <br />
              Esta ação excluirá os registros do banco de dados e os arquivos PDF do armazenamento seguro. Moradores da sua unidade não poderão mais visualizá-los. Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setDeletingMonth(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteMonthLote}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white font-semibold rounded-lg text-sm flex items-center gap-1.5 transition-colors"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Removendo...
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-4 h-4" />
                    Sim, Remover Lote
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL DE UPLOAD DE ZIP (FLUXO MULTI-ETAPAS)             */}
      {/* ======================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 w-full max-w-2xl rounded-2xl shadow-xl flex flex-col my-8 animate-fade-in overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/40">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BoletoIcon className="text-blue-500 w-6 h-6" />
                Upload do Lote de Boletos
              </h3>
              <button
                disabled={isUploading}
                onClick={handleCloseModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo dinâmico dependendo da etapa */}
            <div className="flex-1 p-6 overflow-y-auto max-h-[70vh]">
              
              {/* ETAPA 1: SELECIONAR ZIP E MÊS */}
              {currentStep === 'upload' && (
                <div className="space-y-6">
                  {/* Seletor do Mês de Referência */}
                  <div className="grid gap-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      Mês de Referência dos Boletos
                    </label>
                    <input
                      type="month"
                      value={refMonth}
                      onChange={(e) => setRefMonth(e.target.value)}
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Boletos serão vinculados a este período.
                    </p>
                  </div>

                  {/* Campo de Upload (Input ZIP) */}
                  <div className="grid gap-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      Arquivo ZIP da Contabilidade
                    </label>
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-8 text-center bg-gray-50/50 dark:bg-gray-800/20 transition-all flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-3 text-blue-500">
                        <FileIcon className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {selectedFile ? selectedFile.name : 'Selecione o arquivo ZIP de boletos'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 mb-4">
                        Apenas arquivos no formato .zip
                      </p>
                      
                      <input
                        type="file"
                        accept=".zip"
                        id="zipFileInput"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setSelectedFile(file);
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="zipFileInput"
                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg cursor-pointer shadow-sm active:scale-95 transition-all"
                      >
                        Procurar Arquivo
                      </label>
                    </div>
                  </div>

                  {/* Informações de Formato Recomendado */}
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-amber-800 dark:text-amber-300 text-xs leading-relaxed space-y-2">
                    <p className="font-bold flex items-center gap-1">
                      <InfoIcon className="w-4 h-4 shrink-0" />
                      Instruções importantes sobre o padrão de nomes:
                    </p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Os boletos devem estar nomeados com o número da casa no início, no padrão: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">CASA XX [NOME].pdf</code> (ex: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">CASA 03 SAMARA SILVESTRE.pdf</code>).</li>
                      <li>O arquivo contendo as contas/financeiro geral deve conter a palavra <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">BALANCETE</code> no nome (ex: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">BALANCETE 052026.pdf</code>). Esse arquivo será enviado automaticamente para Documentos &gt; Financeiro.</li>
                      <li>Demais arquivos que não sigam os padrões acima serão listados como ignorados.</li>
                    </ul>
                  </div>

                  {/* Ação */}
                  <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={handleProcessZip}
                      disabled={isProcessing || !selectedFile}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm flex items-center gap-2 active:scale-95 transition-all shadow"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processando ZIP...
                        </>
                      ) : (
                        'Processar Arquivo ZIP'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ETAPA 2: CONFIRMAÇÃO E MAPEAMENTO */}
              {currentStep === 'confirm' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-gray-800 dark:text-white">
                        Visualização e Mapeamento dos Arquivos
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                        Confirme se a correspondência entre arquivo e morador está correta antes de disparar os boletos.
                      </p>
                    </div>
                    
                    <button
                      onClick={() => setCurrentStep('upload')}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                      Voltar
                    </button>
                  </div>

                  {/* Aviso de Reupload se já existir */}
                  {boletos.some(b => b.referenceMonth === refMonth) && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-red-800 dark:text-red-300 text-xs">
                      ⚠️ <strong>Atenção:</strong> Já existem boletos ativos cadastrados para <strong>{formatMonthName(refMonth)}</strong>. 
                      Ao confirmar, o lote anterior deste mês será completamente **deletado** do sistema e substituído por este novo lote.
                    </div>
                  )}

                  {/* Listagem de Arquivos Detectados */}
                  <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto divide-y divide-gray-200 dark:divide-gray-800">
                    {processedFiles.map((file, idx) => {
                      if (file.type === 'boleto') {
                        const hasUser = !!file.matchedUser;
                        return (
                          <div key={idx} className="p-3.5 flex items-start sm:items-center justify-between gap-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                                hasUser 
                                  ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400' 
                                  : 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400'
                              }`}>
                                {file.houseNumber ? String(file.houseNumber).padStart(2, '0') : '??'}
                              </span>
                              <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-200">
                                  {file.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {hasUser 
                                    ? `✅ Morador associado: ${file.matchedUser?.name} (usuário: @${file.matchedUser?.username})`
                                    : '⚠️ Sem cadastro no app: O boleto ficará guardado e ficará acessível quando a conta for criada.'}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 shrink-0">
                              {Math.round(file.size / 1024)} KB
                            </span>
                          </div>
                        );
                      } else if (file.type === 'balancete') {
                        return (
                          <div key={idx} className="p-3.5 flex items-start sm:items-center justify-between gap-3 text-sm bg-blue-50/30 dark:bg-blue-950/10 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 rounded-full flex items-center justify-center shrink-0">
                                <FileIcon className="w-4 h-4" />
                              </span>
                              <div>
                                <p className="font-semibold text-blue-800 dark:text-blue-300">
                                  {file.name}
                                </p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                  📄 Balancete Financeiro Mensal: Será enviado para a seção de Documentos
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-blue-400 shrink-0">
                              {Math.round(file.size / 1024)} KB
                            </span>
                          </div>
                        );
                      } else {
                        return (
                          <div key={idx} className="p-3.5 flex items-start sm:items-center justify-between gap-3 text-sm opacity-60 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full flex items-center justify-center shrink-0">
                                <XIcon className="w-4 h-4" />
                              </span>
                              <div>
                                <p className="font-semibold text-gray-600 dark:text-gray-400 line-through">
                                  {file.name}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                  Ignorado: Não atende ao padrão CASA XX ou BALANCETE
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 shrink-0">
                              {Math.round(file.size / 1024)} KB
                            </span>
                          </div>
                        );
                      }
                    })}
                  </div>

                  {/* Resumo Estatístico */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-800/80 text-center">
                    <div>
                      <div className="text-xl font-extrabold text-gray-800 dark:text-white">
                        {processedFiles.length}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-0.5">
                        Arquivos no ZIP
                      </div>
                    </div>
                    <div>
                      <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                        {processedFiles.filter(f => f.type === 'boleto').length}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-0.5">
                        Boletos
                      </div>
                    </div>
                    <div>
                      <div className="text-xl font-extrabold text-green-600 dark:text-green-400">
                        {processedFiles.filter(f => f.type === 'boleto' && f.matchedUser).length}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-0.5">
                        Com Morador
                      </div>
                    </div>
                    <div>
                      <div className="text-xl font-extrabold text-yellow-600 dark:text-yellow-400">
                        {processedFiles.filter(f => f.type === 'boleto' && !f.matchedUser).length}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-0.5">
                        Sem Morador
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <button
                      disabled={isUploading}
                      onClick={handleCloseModal}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirmAndUpload}
                      disabled={isUploading || processedFiles.filter(f => f.type === 'boleto').length === 0}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold rounded-lg text-sm flex items-center gap-2 transition-all shadow"
                    >
                      {isUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Enviando ({uploadProgress}%)
                        </>
                      ) : (
                        'Confirmar e Enviar Lote'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ETAPA 3: RELATÓRIO PÓS-UPLOAD */}
              {currentStep === 'report' && reportData && (
                <div className="space-y-6">
                  {/* Banner Sucesso */}
                  <div className="p-5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-2xl text-center">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <h4 className="text-lg font-bold text-green-800 dark:text-green-400">
                      Lote Enviado com Sucesso!
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {reportData.total} boletos foram processados e vinculados no mês de {formatMonthName(refMonth)}.
                    </p>
                  </div>

                  {/* Resumo */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-800/80 text-center">
                      <div className="text-2xl font-extrabold text-green-600 dark:text-green-400">
                        {reportData.delivered}
                      </div>
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                        Entregues & Notificados
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-800/80 text-center">
                      <div className="text-2xl font-extrabold text-yellow-600 dark:text-yellow-400">
                        {reportData.stored}
                      </div>
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                        Armazenados p/ Futuro
                      </div>
                    </div>
                  </div>

                  {/* Alerta de Balancete */}
                  {reportData.hasBalancete && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl text-blue-800 dark:text-blue-300 text-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                      O Balancete Geral Financeiro foi enviado para a seção de Documentos.
                    </div>
                  )}

                  {/* Tabs Detalhes */}
                  <div className="space-y-4">
                    <h5 className="text-sm font-bold text-gray-800 dark:text-white">
                      Distribuição Detalhada
                    </h5>

                    {/* Entregues */}
                    {reportData.deliveredList.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                          Entregues (Moradores cadastrados que receberam push)
                        </div>
                        <div className="border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-200 dark:divide-gray-800/60 max-h-[160px] overflow-y-auto">
                          {reportData.deliveredList.map((item, idx) => (
                            <div key={idx} className="p-2 px-3 text-xs flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-700 dark:text-gray-300">
                                  Casa {String(item.house).padStart(2, '0')}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 font-mono text-[10px]" title={item.fileName}>
                                  ({item.fileName})
                                </span>
                              </div>
                              <div className="flex items-center gap-3 justify-between sm:justify-end">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {item.name}
                                </span>
                                <span className="text-gray-400 dark:text-gray-500 font-mono">
                                  @{item.username}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sem Cadastro */}
                    {reportData.storedList.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">
                          Armazenados no Banco (Sem morador cadastrado no app)
                        </div>
                        <div className="border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-200 dark:divide-gray-800/60 max-h-[160px] overflow-y-auto">
                          {reportData.storedList.map((item, idx) => (
                            <div key={idx} className="p-2 px-3 text-xs flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-700 dark:text-gray-300">
                                  Casa {String(item.house).padStart(2, '0')}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 font-mono text-[10px]" title={item.fileName}>
                                  ({item.fileName})
                                </span>
                              </div>
                              <div className="flex items-center gap-3 justify-between sm:justify-end">
                                <span className="text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                                  {item.name}
                                </span>
                                <span className="text-yellow-600 dark:text-yellow-400 text-[10px] font-bold bg-yellow-50 dark:bg-yellow-950/20 px-2 py-0.5 rounded border border-yellow-200 dark:border-yellow-900/30">
                                  Aguardando cadastro
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ações Relatório */}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={handleExportReport}
                      className="px-4 py-2 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-semibold rounded-lg text-sm flex items-center gap-1.5 transition-colors"
                    >
                      <DownloadIcon className="w-4 h-4" />
                      Imprimir Relatório (PDF)
                    </button>
                    <button
                      onClick={handleCloseModal}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Status do progresso persistido na base do modal se estiver enviando */}
            {isUploading && (
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    {uploadStatusText}
                  </span>
                  <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
