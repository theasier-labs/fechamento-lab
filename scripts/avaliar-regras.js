// Linha de base: o motor por regras, SOZINHO, contra o gabarito. Mostra o que a regra resolve e o que sobra para a IA.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { conjuntos, proporcao } from '../src/avaliacao/metricas.js';
import { rodarMotor } from '../src/motor/dataset.js';

const pasta = new URL('../dataset', import.meta.url).pathname;
const gab = JSON.parse(readFileSync(`${pasta}/gabarito.json`, 'utf8'));
const cen = JSON.parse(readFileSync(`${pasta}/cenario.json`, 'utf8'));
const r = rodarMotor(pasta);
const idPorFitid = new Map(cen.extrato.map((l) => [l.fitid, l.id]));

const porConjunto = { dev: [0, 0], calibracao: [0, 0], teste: [0, 0] };
const erros = [];
let total = [0, 0];
for (const l of r.linhas) {
  const id = idPorFitid.get(l.id); const g = gab.lancamentos[id]; const p = r.lancamentos[l.id];
  if (!g || g.resolvidoPor !== 'regra') continue;
  const ok = p?.situacao === g.situacao && (g.vinculo.ids.length === 0 || JSON.stringify([...(p.vinculo?.ids ?? [])].sort()) === JSON.stringify([...g.vinculo.ids].sort()));
  porConjunto[g.conjunto][1]++; total[1]++;
  if (ok) { porConjunto[g.conjunto][0]++; total[0]++; } else erros.push({ id, esperado: `${g.situacao} ${g.vinculo.ids}`, previsto: `${p?.situacao} ${p?.vinculo?.ids ?? ''}` });
}
const chave = (p) => `${p.tipo}|${p.ref}`;
const refLinha = (ref) => idPorFitid.get(ref) ?? ref;
const prevPend = r.pendencias.map((p) => ({ ...p, ref: p.tipo === 'nota_sem_pagamento' || p.tipo === 'nota_duplicada' ? p.ref : refLinha(p.ref) }));
const pend = conjuntos(prevPend.map(chave), gab.pendenciasAposRegras.map(chave));
const restamParaIa = Object.entries(gab.lancamentos).filter(([, g]) => g.resolvidoPor === 'ia').length;
const saida = {
  descricao: 'Motor por regras sozinho (sem IA) contra o gabarito',
  lancamentosDecididosPorRegra: { geral: proporcao(...total), porConjunto: Object.fromEntries(Object.entries(porConjunto).map(([k, v]) => [k, proporcao(...v)])) },
  pendencias: { precisao: pend.precisao, revocacao: pend.revocacao, f1: pend.f1, faltaram: pend.faltaram, sobraram: pend.sobraram },
  restamParaIa, errosDeLancamento: erros, problemasDeLeitura: [...r.problemasOfx, ...r.problemasNfe], verificacoes: r.verificacoes.length,
};
mkdirSync(new URL('../resultados', import.meta.url).pathname, { recursive: true });
writeFileSync(new URL('../resultados/regras.json', import.meta.url).pathname, JSON.stringify(saida, null, 2));
const pc = (x) => `${(x.valor * 100).toFixed(1)}% (${x.k}/${x.n}; IC95% ${(x.ic95[0] * 100).toFixed(0)}–${(x.ic95[1] * 100).toFixed(0)}%)`;
console.log(`Lançamentos que a regra deve decidir: ${pc(saida.lancamentosDecididosPorRegra.geral)}`);
console.log(`Pendências: precisão ${(pend.precisao * 100).toFixed(0)}%, revocação ${(pend.revocacao * 100).toFixed(0)}%, F1 ${(pend.f1 * 100).toFixed(0)}%`);
console.log(`Ficam para a IA: ${restamParaIa} despesas com comprovante em foto (a regra as deixa como "sem documento").`);
if (erros.length) console.log('Erros de lançamento:', JSON.stringify(erros));
if (pend.faltaram.length || pend.sobraram.length) console.log('Pendências: faltaram', pend.faltaram, 'sobraram', pend.sobraram);
