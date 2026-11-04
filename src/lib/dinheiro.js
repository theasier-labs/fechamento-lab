// Dinheiro sempre em centavos inteiros.
export const reais = (centavos) => {
  const n = Math.abs(centavos);
  const inteiro = Math.floor(n / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${centavos < 0 ? '-' : ''}${inteiro},${String(n % 100).padStart(2, '0')}`;
};
export const emReais = (centavos) => `R$ ${reais(centavos)}`;
export const decimal = (centavos) => (centavos / 100).toFixed(2); // 1234.50 (para OFX e XML)
/** "1.234,56" ou "1234.56" para centavos. Devolve null se não for dinheiro. */
export function paraCentavos(texto) {
  const t = String(texto).trim().replace(/R\$\s*/i, '');
  const m = /^(-?)(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?$/.exec(t) ?? /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(t);
  if (!m) return null;
  const inteiro = Number(m[2].replace(/\./g, ''));
  const frac = Number((m[3] ?? '0').padEnd(2, '0'));
  return (m[1] ? -1 : 1) * (inteiro * 100 + frac);
}
