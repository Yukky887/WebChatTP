/** Форматирует score в проценты */
export const formatScore = (score: number): string => {
  if (score === undefined || score === null || isNaN(score)) return '0%';
  return (score * 100).toFixed(1) + '%';
};

/** Форматирует стоимость */
export const formatCost = (cost: number): string => {
  if (!cost || cost === 0) return 'Бесплатно';
  if (cost < 0.001) return `$${(cost * 1000).toFixed(2)}m`;
  return `$${cost.toFixed(4)}`;
};

/** Форматирует количество токенов */
export const formatTokens = (tokens: number): string => {
  return tokens.toLocaleString('ru-RU');
};

/** Обрезает текст */
export const truncateText = (text: string, maxLength: number = 150): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/** Форматирует дату */
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

/** Форматирует размер текста */
export const formatLength = (length: number): string => {
  if (length < 1000) return `${length} симв.`;
  return `${(length / 1000).toFixed(1)}K симв.`;
};