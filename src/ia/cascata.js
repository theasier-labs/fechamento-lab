// Cascata por confiança: modelo barato → modelo forte → pessoa. Cada degrau só roda se o anterior não passou
// na VERIFICAÇÃO (campos válidos, confiança suficiente e vínculo com um lançamento do extrato).
import { extrair } from './extrator.js';
import { vincular } from './vincular.js';

export async function processarComprovante({ provedor, caminhoImagem, periodo, lancamentosSemDocumento, degraus, limiar = 0.75 }) {
  const trilha = []; let custo = 0; let ms = 0;
  for (const modelo of degraus) {
    const e = await extrair({ provedor, modelo, caminhoImagem, periodo });
    custo += e.custo; ms += e.ms;
    const v = e.falhas.length === 0 ? vincular(e.campos, lancamentosSemDocumento) : { resultado: 'revisao_humana', motivo: e.falhas.join('; ') };
    const confiante = e.campos && e.campos.confianca >= limiar;
    trilha.push({ modelo, campos: e.campos, falhas: e.falhas, verificacao: v, confianca: e.campos?.confianca ?? null });
    if (v.resultado === 'vinculado' && confiante) return { decisao: 'vinculado', lancamento: v.lancamento, campos: e.campos, resolvidoPor: modelo, trilha, custo, ms };
  }
  const ultimo = trilha[trilha.length - 1];
  return { decisao: 'revisao_humana', motivo: ultimo.verificacao.motivo ?? 'confiança baixa', campos: ultimo.campos, resolvidoPor: 'pessoa', trilha, custo, ms };
}
