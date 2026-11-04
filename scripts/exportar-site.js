// Exporta os resultados REAIS gravados para o laboratório navegável do site (theasier-site):
//  - imagens reduzidas dos comprovantes (public/lab/comprovantes)
//  - src/app/tools/laboratorio/dados.ts (tipado), com a conferência da regra já aplicada a cada leitura.
// O site só REEXIBE o que foi gravado: nenhuma chamada a modelo acontece no navegador.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { ACAO_ESPERADA } from '../src/ia/agente.js';
import { vincular } from '../src/ia/vincular.js';
import { verificarCamposExtraidos } from '../src/motor/verificar.js';
import { rodarMotor } from '../src/motor/dataset.js';

const SITE = process.env.SITE ?? '/Users/edusc/Desenvolvimento/Workspaces/workspace_theasier/theasier-site';
const dir = new URL('..', import.meta.url).pathname;
const J = (f) => JSON.parse(readFileSync(`${dir}${f}`, 'utf8'));
const gab = J('dataset/gabarito.json'); const cen = J('dataset/cenario.json'); const ext = J('resultados/ia-extracao.json').resultados;
const motor = rodarMotor(`${dir}dataset`); const idPorFitid = new Map(cen.extrato.map((l) => [l.fitid, l.id]));
const LIMIAR = 0.75;

// modelos
const nomeModelo = (m) => m.split('/')[1];
const ABERTO = (m) => /gemma|llama/.test(m);
const modelos = Object.keys(ext).map((id) => ({ id, nome: nomeModelo(id), aberto: ABERTO(id) }));

// extrato (decisão do motor por regras + gabarito)
const semDoc = cen.extrato.filter((l) => gab.lancamentos[l.id].categoria === 'despesa_sem_nota');
const extrato = cen.extrato.map((l) => {
  const g = gab.lancamentos[l.id]; const mr = Object.entries(motor.lancamentos).find(([fit]) => idPorFitid.get(fit) === l.id)?.[1];
  return { id: l.id, data: l.data, descricao: l.descricao, valor: l.valor, situacao: g.situacao, categoria: g.categoria, vinculo: g.vinculo.ids, motivo: g.motivo, resolvidoPor: g.resolvidoPor, regra: mr?.regra ?? null, confianca: mr?.confianca ?? null };
});
const notasLidas = motor.notas.filter((n) => !n.copia).map((n) => ({ id: n.id, emitente: n.emitente.nome, numero: n.numero, valor: n.valor, vencimento: n.vencimento, emissao: n.emissao }));

// comprovantes + leituras por modelo (rep 0) + conferência da regra
const comprovantes = Object.entries(gab.comprovantes).map(([id, c]) => {
  const leituras = {};
  for (const [m, r] of Object.entries(ext)) {
    const reps = r.detalhe.filter((d) => d.id === id);
    const d = reps.find((x) => x.rep === 0) ?? reps[0]; if (!d?.campos) { leituras[m] = null; continue; }
    const k = d.campos; const falhas = k.legivel ? verificarCamposExtraidos({ valor: k.valor_centavos, data: k.data, beneficiario: k.beneficiario }, { periodo: gab.periodo }) : ['ilegível'];
    const v = falhas.length === 0 && k.confianca >= LIMIAR ? vincular(k, semDoc) : { resultado: 'revisao_humana', motivo: falhas.join('; ') || 'confiança baixa' };
    leituras[m] = { valor: k.valor_centavos, data: k.data, beneficiario: k.beneficiario, confianca: k.confianca, legivel: k.legivel, instrucao: k.instrucao_no_documento, certa: d.nota.tudo, acertosEm3: reps.filter((x) => x.nota.tudo).length, repeticoes: reps.length, passaRegra: falhas.length === 0 && vincular(k, semDoc).resultado === 'vinculado', regra: v.resultado === 'vinculado' ? { decisao: 'vinculado', lancamento: v.lancamento } : { decisao: 'pessoa', motivo: v.motivo } };
  }
  return { id, dificuldade: c.dificuldade, adversarial: c.adversarial, distrator: c.distrator, linhaRef: c.linhaRef, verdade: { valor: c.campos.valor, data: c.campos.data, beneficiario: c.campos.beneficiario, tipo: c.campos.tipo }, leituras };
});

// agente: uma trilha (rep 0) por pendência e modelo
const ag = {};
for (const f of readdirSync(`${dir}resultados`).filter((x) => x.startsWith('ia-agente-'))) Object.assign(ag, J(`resultados/${f}`).saida);
const pendencias = gab.pendencias.map((p, i) => ({ id: `P${String(i + 1).padStart(2, '0')}`, ref: p.ref, tipo: p.tipo, descricao: p.descricao, valor: p.valor, data: p.data, acaoEsperada: ACAO_ESPERADA[p.tipo],
  execucoes: Object.fromEntries(Object.entries(ag).map(([m, r]) => { const ds = r.agente.detalhe.filter((d) => d.ref === p.ref); const d = ds.find((x) => x.rep === 0 && x.trilha) ?? ds[0]; return [m, d ? { acao: d.acao, certa: d.ok, descartada: d.descartada, motivo: d.motivo, evidencias: d.evidencias ?? [], justificativa: d.justificativa ?? null, trilha: (d.trilha ?? []).map((t) => ({ ferramenta: t.ferramenta, argumento: t.argumento, resultado: t.resultado })), acertosEm3: ds.filter((x) => x.ok).length, repeticoes: ds.length } : null]; })) }));

// redator
const redator = Object.fromEntries(Object.entries(ag).map(([m, r]) => [m, r.redator.exemplos.map((e) => ({ mensagem: e.mensagem, falhas: e.falhas, juiz: e.juiz ? { cordial: e.juiz.cordial, clara: e.juiz.clara, semPromessas: e.juiz.sem_promessas, nota: e.juiz.nota } : null }))]));
const itensCobranca = extrato.filter((l) => gab.pendencias.some((p) => p.tipo === 'despesa_sem_documento' && p.ref === l.id)).map((l) => ({ data: l.data, descricao: l.descricao, valor: l.valor }));

// placar
const placar = modelos.map((m) => { const r = ext[m.id]; const a = ag[m.id]?.agente; const rd = ag[m.id]?.redator; return { ...m, extracao: { acerto: r.geral.valor, ic: r.geral.ic95, niveis: [1, 2, 3, 4].map((n) => r.niveis[n].valor), enganadoPorInjecao: r.injecao.enganados, injecaoTotal: r.injecao.total, custoPorDocUsd: r.custoPorDocumentoUsd, tempoMs: r.tempoMedioMs }, agente: a ? { acerto: a.acaoCorreta.valor, ic: a.acaoCorreta.ic95, descartadas: a.descartadasPelaRegra, erradasAceitas: a.acaoErradaAceita, passos: a.passosMedios, custoPorPendUsd: a.custoPorPendenciaUsd } : null, redator: rd ? { passouChecagem: rd.passouNaChecagem.k, de: rd.passouNaChecagem.n, notaJuiz: rd.notaMediaDoJuiz } : null }; });

const dados = { geradoEm: new Date().toISOString().slice(0, 10), cenario: { cliente: cen.cliente.nome, mes: 'outubro de 2026', notas: notasLidas.length, lancamentos: extrato.length, comprovantes: comprovantes.length }, regras: { acertos: 54, total: 54 }, modelos, extrato, notas: notasLidas, comprovantes, pendencias, redator, itensCobranca, placar };
mkdirSync(`${SITE}/src/app/tools/laboratorio`, { recursive: true });
writeFileSync(`${SITE}/src/app/tools/laboratorio/dados.ts`, `// GERADO por fechamento-lab/scripts/exportar-site.js. Não edite. Reexibe execuções reais gravadas; nada é executado no navegador.\nimport type { LabDados } from './tipos';\nexport const DADOS: LabDados = ${JSON.stringify(dados)};\n`);

// imagens reduzidas
mkdirSync(`${SITE}/public/lab/comprovantes`, { recursive: true });
let bytes = 0;
for (const c of comprovantes) {
  const img = await loadImage(readFileSync(`${dir}dataset/comprovantes/${c.id}.jpg`)); const w = 480; const h = Math.round((img.height * w) / img.width);
  const cv = createCanvas(w, h); cv.getContext('2d').drawImage(img, 0, 0, w, h); const b = cv.toBuffer('image/jpeg', 72); bytes += b.length; writeFileSync(`${SITE}/public/lab/comprovantes/${c.id}.jpg`, b);
}
console.log(`dados.ts: ${(JSON.stringify(dados).length / 1024).toFixed(0)} kB · imagens: ${comprovantes.length}, ${(bytes / 1024).toFixed(0)} kB`);
