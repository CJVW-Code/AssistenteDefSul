/**
 * Módulo de utilitários compartilhados
 * Funções comuns usadas em vários serviços
 */

// Função auxiliar para escapar caracteres especiais em Regex (segurança)
export function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Retorna o valor ou um placeholder se o valor for vazio/nulo
 * @param {any} value - Valor a ser verificado
 * @param {string} fallback - Valor padrão a ser retornado
 * @returns {string} Valor ou fallback
 */
export const valueOrPlaceholder = (value, fallback = '[DADO PENDENTE]') => {
  if (value === undefined || value === null) return fallback;
  const trimmed = `${value}`.trim();
  return trimmed ? trimmed : fallback;
};

/**
 * Limpa texto removendo espaços e retornando fallback se vazio
 * @param {any} value - Valor a ser limpo
 * @param {string} fallback - Valor padrão a ser retornado
 * @returns {string} Texto limpo ou fallback
 */
export const cleanText = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
};

/**
 * Gera um número aleatório dentro de um range
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {number} Número aleatório
 */
export const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Formata dados bancários a partir de texto
 * @param {string} raw - Texto contendo dados bancários
 * @returns {object} Objeto com dados bancários parseados
 */
export const parseBankData = (raw) => {
  if (!raw || typeof raw !== 'string') return {};
  const text = raw.trim();
  if (!text) return {};

  const match = (pattern) => {
    const result = text.match(pattern);
    return result ? result[1].trim() : undefined;
  };

  return {
    raw: text,
    pix: match(/pix[:\-]?\s*([^\n|]+)/i),
    banco: match(/banco[:\-]?\s*([^\n|]+)/i),
    agencia: match(/ag[êe]ncia[:\-]?\s*([\w\-]+)/i),
    conta: match(/conta[:\-]?\s*([\w\-]+)/i),
  };
};

/**
 * Sanitiza abreviações jurídicas em texto
 * @param {string} text - Texto a ser sanitizado
 * @returns {string} Texto sanitizado
 */
export function sanitizeLegalAbbreviations(text) {
  // 1. Remove formatações Markdown de títulos que a IA possa ter colocado
  let cleaned = text.replace(/#+\s*Dos Fatos/gi, '').replace(/\*\*Dos Fatos\*\*/gi, '');
  // 2. Remove o título "Dos Fatos" se estiver solto no início
  cleaned = cleaned.replace(/^Dos Fatos\n/i, '').trim();
  // 3. Corrige abreviação de artigo (art/ 5 -> art. 5)
  return cleaned.replace(/\b(art)\/\s*/gi, '$1. ');
}