// Harness: cada modelo lê os 25 comprovantes (3 repetições). Mede acerto por campo e por nível de dificuldade
// (com intervalo de Wilson), resistência à injeção, variância, custo e tempo. Teto de gasto embutido.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { desvio, media, pontuarExtracao } from '../src/avaliacao/pontuar.js';
import { proporcao } from '../src/avaliacao/metricas.js';
import { extrair } from '../src/ia/extrator.js';
import { ProvedorOpenRouter } from '../src/ia/provedor.js';

const MODELOS = (process.env.MODELOS ?? 'google/gemini-2.5-flash-lite,openai/gpt-4.1-mini,anthropic/claude-haiku-4.5,meta-llama/llama-4-maverick,google/gemma-4-31b-it,anthropic/claude-sonnet-4.5').split(',');
const REPS = Number(process.env.REPS ?? 3); const TETO = Number(process.env.TETO_USD ?? 3); const CONC = 6;
const pasta = new URL('../dataset', import.meta.url).pathname;
const gab = JSON.parse(readFileSync(`${pasta}/gabarito.json`, 'utf8'));
const periodo = gab.periodo;
const comps = Object.entries(gab.comprovantes).map(([id, c]) => ({ id, ...c, esperado: { valor: c.campos.valor, data: c.campos.data, beneficiario: c.campos.beneficiario } }));
const provedor = new ProvedorOpenRouter();
let abortar = false;

async function pool(tarefas, n) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < tarefas.length) { const k = i++; out[k] = await tarefas[k](); } })); return out; }

const resultados = {};
for (const modelo of MODELOS) {
  const tarefas = [];
  for (let rep = 0; rep < REPS; rep++) for (const c of comps) tarefas.push(async () => {
    if (abortar || provedor.gasto > TETO) { abortar = true; return null; }
    try { const e = await extrair({ provedor, modelo, caminhoImagem: `${pasta}/comprovantes/${c.id}.jpg`, periodo, rotulo: `rep${rep}`, temperatura: rep === 0 ? 0 : 0.3 }); return { id: c.id, rep, ...e, nota: pontuarExtracao(e.campos, c.esperado) }; }
    catch (err) { return { id: c.id, rep, erro: err.message.slice(0, 120), nota: pontuarExtracao(null, c.esperado), custo: 0, ms: 0 }; }
  });
  const rs = (await pool(tarefas, CONC)).filter(Boolean);
  const por = (f) => { const x = rs.filter(f); return proporcao(x.filter((r) => r.nota.tudo).length, x.length); };
  const base = (r) => !comps.find((c) => c.id === r.id).distrator;
  const niveis = Object.fromEntries([1, 2, 3, 4].map((n) => [n, por((r) => comps.find((c) => c.id === r.id).dificuldade === n && !comps.find((c) => c.id === r.id).adversarial)]));
  const adv = rs.filter((r) => comps.find((c) => c.id === r.id).adversarial);
  const enganados = adv.filter((r) => r.campos && (r.campos.valor_centavos === 1 || !r.nota.valor)).length;
  const sinalizou = adv.filter((r) => r.campos?.instrucao_no_documento).length;
  const porRep = Array.from({ length: REPS }, (_, k) => { const x = rs.filter((r) => r.rep === k); return x.filter((r) => r.nota.tudo).length / (x.length || 1); });
  resultados[modelo] = {
    geral: por(() => true), niveis, injecao: { total: adv.length, enganados, sinalizouAInstrucao: sinalizou },
    variancia: { acertoPorRepeticao: porRep, desvioPadrao: desvio(porRep) },
    custoTotalUsd: rs.reduce((s, r) => s + (r.custo ?? 0), 0), custoPorDocumentoUsd: media(rs.map((r) => r.custo ?? 0)), tempoMedioMs: media(rs.map((r) => r.ms ?? 0)),
    erros: rs.filter((r) => r.erro).length, detalhe: rs.map(({ id, rep, campos, falhas, nota, erro }) => ({ id, rep, campos, falhas, nota, erro })),
  };
  const r = resultados[modelo];
  console.log(`${modelo.padEnd(34)} acerto ${(r.geral.valor * 100).toFixed(0)}% (IC ${(r.geral.ic95[0] * 100).toFixed(0)}–${(r.geral.ic95[1] * 100).toFixed(0)}) · níveis ${[1, 2, 3, 4].map((n) => (r.niveis[n].valor * 100).toFixed(0)).join('/')}% · enganado ${enganados}/${adv.length} · US$ ${r.custoPorDocumentoUsd.toFixed(5)}/doc · ${(r.tempoMedioMs / 1000).toFixed(1)}s · erros ${r.erros}`);
}
mkdirSync(new URL('../resultados', import.meta.url).pathname, { recursive: true });
writeFileSync(new URL('../resultados/ia-extracao.json', import.meta.url).pathname, JSON.stringify({ geradoEm: new Date().toISOString().slice(0, 10), repeticoes: REPS, gastoSessaoUsd: provedor.gasto, abortadoPeloTeto: abortar, resultados }, null, 2));
console.log(`Gasto desta execução: US$ ${provedor.gasto.toFixed(4)}${abortar ? ' (ABORTADO pelo teto)' : ''}`);
