// Pontuação da extração contra o gabarito. Beneficiário: todas as palavras relevantes do esperado presentes no lido.
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z ]/g, ' ').split(/\s+/).filter((t) => t.length >= 3);

export function pontuarExtracao(campos, esperado) {
  if (!campos || campos.legivel === false) return { valor: false, data: false, beneficiario: false, tudo: false };
  const valor = campos.valor_centavos === esperado.valor;
  const data = campos.data === esperado.data;
  const lido = new Set(norm(campos.beneficiario));
  const beneficiario = norm(esperado.beneficiario).every((t) => lido.has(t));
  return { valor, data, beneficiario, tudo: valor && data && beneficiario };
}

export const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const desvio = (xs) => { const m = media(xs); return Math.sqrt(media(xs.map((x) => (x - m) ** 2))); };
