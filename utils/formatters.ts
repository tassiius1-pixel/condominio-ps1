export const formatCPF = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

export const formatName = (name: string): string => {
    if (!name) return '';
    const prepositions = ['de', 'da', 'do', 'das', 'dos', 'e'];
    return name
        .toLowerCase()
        .split(' ')
        .map((word, index) => {
            if (index > 0 && prepositions.includes(word)) {
                return word;
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
};
