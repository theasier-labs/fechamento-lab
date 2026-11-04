// Reaproveita as leituras já feitas (resultados/ia-extracao.json) e aplica a verificação da regra + vínculo ao extrato.
// Pergunta: quantos vínculos ERRADOS cada modelo deixaria passar sozinho, e quantos vínculos CERTOS a regra deixa passar?
import { readFileSync, writeFileSync } from 'node:fs';
import { proporcao } from '../src/avaliacao/metricas.js';
import { verificarCamposExtraidos } from '../src/motor/verificar.js';
import { vincular } from '../src/ia/vincular.js';

const dir = new URL('..', import.meta.url).pathname;
const ext = JSON.parse(readFileSync(`${dir}resultados/ia-extracao.json`, 'utf8')).resultados;
const gab = JSON.parse(readFileSync(`${dir}dataset/gabarito.json`, 'utf8'));
const cen = JSON.parse(readFileSync(`${dir}dataset/cenario.json`, 'utf8'));
const semDoc = cen.extrato.filter((l) => gab.lancamentos[l.id].categoria === 'despesa_sem_nota'); // 10 despesas sem nota
const LIMIAR = 0.75;
const saida = {};
for (const [modelo, r] of Object.entries(ext)) {
  let semRegra = { vincErrado: 0, vincCerto: 0, n: 0 }; let comRegra = { vincErrado: 0, vincCerto: 0, n: 0, humano: 0 };
  for (const d of r.detalhe) {
    const g = gab.comprovantes[d.id]; if (!d.campos) { comRegra.humano++; comRegra.n++; semRegra.n++; continue; }
    const esperado = g.adversarial || g.distrator ? null : g.linhaRef; // null = ninguém deveria ser vinculado
    // SEM a regra: aceita o que o modelo leu, se confiante, ligando ao lançamento de mesmo valor (ignora período e data)
    const ingenuo = d.campos.legivel && d.campos.confianca >= LIMIAR ? semDoc.find((l) => -l.valor === d.campos.valor_centavos && l.data.slice(5) === (d.campos.data ?? '').slice(5)) : null;
    semRegra.n++; if (ingenuo) { if (ingenuo.id === esperado) semRegra.vincCerto++; else semRegra.vincErrado++; }
    // COM a regra: campos verificados (período, validade) + vínculo exato com janela de 3 dias
    const falhas = d.campos.legivel ? verificarCamposExtraidos({ valor: d.campos.valor_centavos, data: d.campos.data, beneficiario: d.campos.beneficiario }, { periodo: gab.periodo }) : ['ilegível'];
    const v = falhas.length === 0 && d.campos.confianca >= LIMIAR ? vincular(d.campos, semDoc) : { resultado: 'revisao_humana' };
    comRegra.n++; if (v.resultado === 'vinculado') { if (v.lancamento === esperado) comRegra.vincCerto++; else comRegra.vincErrado++; } else comRegra.humano++;
  }
  const esperados = Object.values(gab.comprovantes).filter((c) => !c.adversarial && !c.distrator && c.linhaRef && gab.lancamentos[c.linhaRef].categoria === 'despesa_sem_nota').length * (r.detalhe.length / 25);
  saida[modelo] = { comRegra: { ...comRegra, vinculosErradosAceitos: proporcao(comRegra.vincErrado, comRegra.n), vinculosCertos: proporcao(comRegra.vincCerto, esperados) }, soModelo: { ...semRegra, vinculosErradosAceitos: proporcao(semRegra.vincErrado, semRegra.n) } };
  console.log(`${modelo.padEnd(32)} só o modelo: ${semRegra.vincErrado} vínculos errados aceitos | com a regra: ${comRegra.vincErrado} errados, ${comRegra.vincCerto}/${esperados} certos, ${comRegra.humano} para a pessoa`);
}
writeFileSync(`${dir}resultados/ia-pipeline.json`, JSON.stringify(saida, null, 2));
