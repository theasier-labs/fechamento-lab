// Agente de pendências (12 pendências, ferramentas somente leitura) e redator da cobrança (lista de checagem + juiz).
import { readFileSync, writeFileSync } from 'node:fs';
import { proporcao } from '../src/avaliacao/metricas.js';
import { media } from '../src/avaliacao/pontuar.js';
import { ACAO_ESPERADA, criarFerramentas, investigar } from '../src/ia/agente.js';
import { ProvedorOpenRouter } from '../src/ia/provedor.js';
import { julgar, redigir } from '../src/ia/redator.js';
import { lerCenario } from '../src/motor/dataset.js';

const MODELOS = (process.env.MODELOS ?? 'google/gemma-4-31b-it,openai/gpt-4.1-mini,anthropic/claude-haiku-4.5,google/gemini-2.5-flash-lite').split(',');
const JUIZ = process.env.JUIZ ?? 'anthropic/claude-sonnet-4.5'; const REPS = 3; const TETO = Number(process.env.TETO_USD ?? 2);
const pasta = new URL('../dataset', import.meta.url).pathname;
const gab = JSON.parse(readFileSync(`${pasta}/gabarito.json`, 'utf8')); const cen = JSON.parse(readFileSync(`${pasta}/cenario.json`, 'utf8'));
const c = lerCenario(pasta);
const mensagens = readFileSync(`${pasta}/whatsapp.txt`, 'utf8').split('\n').filter((l) => l.startsWith('[')).map((l, i) => ({ id: `M${String(i + 1).padStart(3, '0')}`, texto: l.replace(/^\[[^\]]*\]\s*[^:]*:\s*/, '') }));
const pendencias = gab.pendencias;
const ferramentas = criarFerramentas({ extrato: cen.extrato, notas: c.notas, mensagens, pendencias });
const prov = new ProvedorOpenRouter();
const saida = {};
for (const modelo of MODELOS) {
  const ag = [];
  for (let rep = 0; rep < REPS; rep++) for (const p of pendencias) {
    if (prov.gasto > TETO) throw new Error('teto de gasto');
    const pe = { ...p, rep }; // `rep` só diferencia a chamada no cache
    const r = await investigar({ provedor: { chamar: (q) => prov.chamar({ ...q, rotulo: `rep${rep}`, temperatura: rep === 0 ? 0 : 0.3 }) }, modelo, pendencia: { ref: p.ref, descricao: p.descricao, valor: p.valor, data: p.data }, ferramentas }).catch((e) => ({ proposta: null, motivo: e.message.slice(0, 80), trilha: [], custo: 0 }));
    ag.push({ ref: p.ref, tipo: p.tipo, rep, acao: r.proposta?.acao ?? null, descartada: !r.proposta, motivo: r.motivo ?? null, passos: r.trilha.length, custo: r.custo, ok: r.proposta?.acao === ACAO_ESPERADA[p.tipo], trilha: rep === 0 ? r.trilha : undefined, justificativa: r.proposta?.justificativa });
  }
  const itens = cen.extrato.filter((l) => gab.pendencias.some((p) => p.tipo === 'despesa_sem_documento' && p.ref === l.id)).map((l) => ({ data: l.data, descricao: l.descricao, valor: l.valor }));
  const red = [];
  for (let rep = 0; rep < REPS; rep++) {
    const r = await redigir({ provedor: { chamar: (q) => prov.chamar({ ...q, rotulo: `rep${rep}`, temperatura: 0.3 }) }, modelo, itens, nomeCliente: 'Aurora' }).catch((e) => ({ mensagem: '', falhas: [e.message.slice(0, 80)], custo: 0 }));
    const j = r.mensagem && r.falhas.length === 0 ? await julgar({ provedor: prov, modelo: JUIZ, mensagem: r.mensagem }).catch(() => null) : null;
    red.push({ mensagem: r.mensagem, falhas: r.falhas, juiz: j });
  }
  const certas = ag.filter((x) => x.ok).length;
  saida[modelo] = {
    agente: { acaoCorreta: proporcao(certas, ag.length), descartadasPelaRegra: ag.filter((x) => x.descartada).length, acaoErradaAceita: ag.filter((x) => !x.descartada && !x.ok).length, passosMedios: media(ag.map((x) => x.passos)), custoPorPendenciaUsd: media(ag.map((x) => x.custo)), porTipo: Object.fromEntries(Object.keys(ACAO_ESPERADA).map((t) => { const x = ag.filter((a) => a.tipo === t); return [t, proporcao(x.filter((a) => a.ok).length, x.length)]; })), detalhe: ag },
    redator: { passouNaChecagem: proporcao(red.filter((x) => x.falhas.length === 0).length, red.length), notaMediaDoJuiz: media(red.map((x) => x.juiz?.nota).filter(Boolean)), exemplos: red },
  };
  const a = saida[modelo].agente; const r = saida[modelo].redator;
  console.log(`${modelo.padEnd(30)} agente: ação certa ${(a.acaoCorreta.valor * 100).toFixed(0)}% (IC ${(a.acaoCorreta.ic95[0] * 100).toFixed(0)}–${(a.acaoCorreta.ic95[1] * 100).toFixed(0)}), descartadas ${a.descartadasPelaRegra}, erradas aceitas ${a.acaoErradaAceita}, ${a.passosMedios.toFixed(1)} passos, US$ ${a.custoPorPendenciaUsd.toFixed(5)}/pend · redator: checagem ${r.passouNaChecagem.k}/${r.passouNaChecagem.n}, juiz ${r.notaMediaDoJuiz.toFixed(1)}`);
}
writeFileSync(new URL('../resultados/ia-agente-' + (process.env.MODELOS ?? 'todos').replace(/[^a-z0-9]/gi, '_') + '.json', import.meta.url).pathname, JSON.stringify({ geradoEm: new Date().toISOString().slice(0, 10), juiz: JUIZ, gastoUsd: prov.gasto, saida }, null, 2));
console.log(`Gasto: US$ ${prov.gasto.toFixed(4)}`);
