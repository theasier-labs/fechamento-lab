// Leitor de OFX 1.x (SGML) e 2.x (XML): tolera tags de folha sem fechamento. Nunca descarta em silêncio:
// o que não conseguir ler vai para `problemas` com o motivo.
import { paraCentavos } from '../lib/dinheiro.js';

const campo = (bloco, tag) => new RegExp(`<${tag}>\\s*([^<\\r\\n]*)`, 'i').exec(bloco)?.[1]?.trim() ?? null;

export function lerOfx(texto) {
  const linhas = []; const problemas = [];
  const blocos = [...String(texto).matchAll(/<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST>))/gi)];
  if (blocos.length === 0) problemas.push({ motivo: 'Nenhum lançamento (STMTTRN) encontrado no arquivo' });
  blocos.forEach((m, i) => {
    const b = m[1]; const dt = campo(b, 'DTPOSTED'); const amt = campo(b, 'TRNAMT');
    const data = dt && /^\d{8}/.test(dt) ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}` : null;
    const valor = amt == null ? null : paraCentavos(amt.replace(',', '.'));
    if (!data) return problemas.push({ posicao: i + 1, motivo: `Data inválida ("${dt}")` });
    if (valor == null) return problemas.push({ posicao: i + 1, motivo: `Valor inválido ("${amt}")` });
    linhas.push({ id: campo(b, 'FITID') ?? `pos-${i + 1}`, data, valor, descricao: campo(b, 'MEMO') ?? campo(b, 'NAME') ?? '', posicao: i + 1 });
  });
  return { linhas, problemas };
}
