/**
 * Utilitário para carregar scripts externos dinamicamente.
 * Evita o carregamento de scripts pesados no início da aplicação, melhorando o tempo de carregamento inicial.
 */
export const loadScript = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Verifica se o script já foi adicionado ao documento
    const existingScript = document.querySelector(`script[src="${url}"]`) as HTMLScriptElement | null;
    
    if (existingScript) {
      if (existingScript.getAttribute('data-loaded') === 'true') {
        resolve();
        return;
      }
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.setAttribute('data-loaded', 'false');

    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    };

    script.onerror = (e) => {
      console.error(`Erro ao carregar o script: ${url}`, e);
      reject(e);
    };

    document.head.appendChild(script);
  });
};

/**
 * Carrega a biblioteca Chart.js se ainda não estiver carregada.
 */
export const loadChartJS = (): Promise<void> => {
  return loadScript('https://cdn.jsdelivr.net/npm/chart.js');
};

/**
 * Carrega o jsPDF e seu plugin autoTable sequencialmente.
 */
export const loadJsPDF = async (): Promise<void> => {
  // jsPDF precisa ser carregado primeiro
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  // Em seguida carrega o plugin autoTable que depende do jsPDF
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js');
};
