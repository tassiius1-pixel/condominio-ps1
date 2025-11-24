import { GoogleGenAI, Type } from "@google/genai";
import { SECTORS, REQUEST_TYPES, PRIORITIES } from '../constants';
import { Sector, RequestType, Priority } from '../types';

// PEGAR A CHAVE DO .env.local
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// ⚠️ SE A CHAVE NÃO EXISTE → Erro claro e amigável
if (!apiKey) {
  throw new Error("❌ ERRO: VITE_GEMINI_API_KEY não encontrada no .env.local");
}

// Inicializa o Gemini
const ai = new GoogleGenAI({
  apiKey
});

interface SuggestionResponse {
  sector: Sector;
  type: RequestType;
  priority: Priority;
}

export const suggestRequestDetails = async (description: string): Promise<SuggestionResponse | null> => {
  if (description.trim().split(/\s+/).length < 3) {
    return null; // evita disparos com texto muito curto
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analise a seguinte descrição de um problema de manutenção em um condomínio e classifique-o em um "sector", "type" e "priority".
      
      Descrição: "${description}"

      Use as seguintes regras:
      
      - URGENTE: risco iminente (incêndio, gás, curto grave, vazamento grande)
      - ALTA: afeta uso das áreas comuns ou segurança (portão quebrado, elevador parado, falta de água, luz queimada em área escura)
      - MÉDIA: incômodo funcional (goteiras, lâmpadas queimadas, pequenos vazamentos, interfone com chiado)
      - BAIXA: estética ou melhoria (pintura descascando, poda de jardim, limpeza)

      Responda SOMENTE com JSON válido.
      
      Valores possíveis para "sector": ${SECTORS.join(', ')}
      Valores possíveis para "type": ${REQUEST_TYPES.join(', ')} (inclui "Pequenos reparos")
      Valores possíveis para "priority": ${PRIORITIES.join(', ')}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sector: { type: Type.STRING, enum: SECTORS },
            type: { type: Type.STRING, enum: REQUEST_TYPES },
            priority: { type: Type.STRING, enum: PRIORITIES },
          },
          required: ["sector", "type", "priority"]
        }
      }
    });

    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);

    if (
      SECTORS.includes(result.sector) &&
      REQUEST_TYPES.includes(result.type) &&
      PRIORITIES.includes(result.priority)
    ) {
      return result as SuggestionResponse;
    }

    console.warn("⚠️ Gemini retornou valores inválidos:", result);
    return null;

  } catch (error) {
    console.error("❌ Erro no Gemini:", error);
    return null;
  }
};

export const generateReportSummary = async (reportData: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        Aja como um gerente de condomínio experiente.
        Gere um resumo executivo (3–5 parágrafos), destacando:
        - problemas mais frequentes
        - setores mais críticos
        - tendências
        - tom profissional e informativo
        
        Dados:
        ${reportData}
      `
    });

    return response.text;

  } catch (error) {
    console.error("❌ Erro no resumo do Gemini:", error);
    return "Não foi possível gerar o resumo. Verifique a conexão.";
  }
};
