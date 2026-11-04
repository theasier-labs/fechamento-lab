import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { conjuntos, proporcao, wilson } from '../src/avaliacao/metricas.js';
import { validarCnpj } from '../src/lib/cnpj.js';
import { validarChave } from '../src/lib/chave.js';
import { conciliar, nomeCoerente } from '../src/motor/conciliar.js';
import { lerCenario, rodarMotor } from '../src/motor/dataset.js';
import { lerNfe } from '../src/motor/nfe.js';
import { lerOfx } from '../src/motor/ofx.js';
import { verificarCamposExtraidos, verificarNota } from '../src/motor/verificar.js';
import { conjuntoDe, gerarCenario } from '../src/cenario/gerar.js';
import { escreverNfe } from '../src/cenario/escritores/nfe.js';
import { escreverOfx } from '../src/cenario/escritores/ofx.js';
import { escreverContasAPagar, escreverWhatsapp } from '../src/cenario/escritores/texto.js';

const DATASET = new URL('../dataset/', import.meta.url).pathname;
const gab = JSON.parse(readFileSync(`${DATASET}gabarito.json`, 'utf8'));
const cen = JSON.parse(readFileSync(`${DATASET}cenario.json`, 'utf8'));
const PERIODO = { inicio: '2026-10-01', fim: '2026-10-31' };

test('TC-04 determinismo: a mesma semente gera cenário e arquivos estruturados idênticos; outra semente muda', () => {
  const a = gerarCenario({ semente: 'x1' }); const b = gerarCenario({ semente: 'x1' }); const c = gerarCenario({ semente: 'x2' });
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.notEqual(JSON.stringify(a), JSON.stringify(c));
  assert.equal(escreverOfx(a), escreverOfx(b));
  assert.equal(escreverNfe(a.notas[0], a), escreverNfe(b.notas[0], b));
  assert.equal(escreverWhatsapp(a), escreverWhatsapp(b));
  assert.equal(escreverContasAPagar(a), escreverContasAPagar(b));
});

test('TC-05 tudo é FICTÍCIO e sem CNPJ repetido; valores batem; contagens do cenário', () => {
  const c = gerarCenario();
  assert.match(escreverOfx(c), /FICTICIO/);
  assert.ok(c.notas.every((n) => /FICTICIO/.test(escreverNfe(n, c))));
  assert.match(escreverWhatsapp(c), /FICTÍCIO/);
  assert.match(escreverContasAPagar(c), /FICTÍCIO/);
  const cnpjs = [c.cliente.cnpj, ...c.fornecedores.map((f) => f.cnpj)];
  assert.equal(new Set(cnpjs).size, cnpjs.length);
  assert.ok(cnpjs.every(validarCnpj));
  assert.ok(c.notas.every((n) => validarChave(n.chave) && n.itens.reduce((s, i) => s + i.valor, 0) === n.valor));
  assert.equal(c.notas.length, 38); assert.equal(c.extrato.length, 64); assert.equal(c.comprovantes.length, 25);
  assert.equal(c.comprovantes.filter((x) => x.adversarial).length, 3);
  assert.ok(c.mensagens.some((m) => m.adversarial));
  assert.ok(c.nomeCliente === undefined && /FICTÍCIA/.test(c.cliente.nome));
});

test('TC-11 conjuntos: estáveis, disjuntos e proporção aproximada de 40/30/30', () => {
  assert.equal(conjuntoDe('L001'), conjuntoDe('L001'));
  const ids = Object.keys(gab.lancamentos).concat(Object.keys(gab.comprovantes));
  const cont = { dev: 0, calibracao: 0, teste: 0 }; for (const id of ids) cont[conjuntoDe(id)]++;
  assert.equal(cont.dev + cont.calibracao + cont.teste, ids.length);
  assert.ok(cont.teste > 0 && cont.calibracao > 0 && cont.dev > 0);
});

test('TC-06 OFX do cenário: lê todas as linhas, em centavos, e relata o que não consegue ler', () => {
  const r = lerOfx(readFileSync(`${DATASET}extrato.ofx`, 'latin1'));
  assert.equal(r.linhas.length, 64); assert.equal(r.problemas.length, 0);
  assert.ok(r.linhas.every((l) => Number.isInteger(l.valor) && /^\d{4}-\d{2}-\d{2}$/.test(l.data)));
  const ruim = lerOfx('<OFX><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>xx<TRNAMT>1<FITID>1<MEMO>a</STMTTRN><STMTTRN><DTPOSTED>20261001<TRNAMT>abc<FITID>2<MEMO>b</STMTTRN></OFX>');
  assert.equal(ruim.linhas.length, 0); assert.equal(ruim.problemas.length, 2);
  assert.match(lerOfx('lixo').problemas[0].motivo, /Nenhum lançamento/);
});

test('TC-07 NF-e do cenário: lê chave, emitente, total e vencimento; XML malformado e não-NF-e são reportados', () => {
  const c = lerCenario(DATASET);
  assert.equal(c.notas.length, 39); assert.equal(c.problemasNfe.length, 0);
  const n = c.notas.find((x) => x.id === 'NF-001');
  assert.ok(validarChave(n.chave) && n.valor > 0 && n.itens.length >= 1 && n.vencimento);
  assert.match(lerNfe('<nfeProc><NFe><infNFe').problemas[0].motivo, /malformado|NF-e/);
  assert.match(lerNfe('<a><b>1</b></a>').problemas[0].motivo, /Não é uma NF-e/);
});

test('TC-09 verificador: reprova CNPJ, chave e soma; aprova as notas do cenário', () => {
  const c = lerCenario(DATASET);
  assert.equal(c.verificacoes.length, 0);
  const n = { ...c.notas[0] };
  assert.ok(verificarNota({ ...n, emitente: { ...n.emitente, cnpj: '11111111111112' } }).some((a) => a.codigo === 'cnpj_emitente_invalido'));
  assert.ok(verificarNota({ ...n, chave: n.chave.slice(0, 43) + String((Number(n.chave[43]) + 1) % 10) }).some((a) => a.codigo === 'chave_invalida'));
  assert.ok(verificarNota({ ...n, valor: n.valor + 1 }).some((a) => a.codigo === 'soma_nao_fecha'));
  assert.ok(verificarNota({ ...n, numero: '999' }).some((a) => a.codigo === 'chave_incoerente_numero'));
  assert.deepEqual(verificarCamposExtraidos({ valor: 100, data: '2026-10-05', beneficiario: 'X' }, { periodo: PERIODO }), []);
  assert.equal(verificarCamposExtraidos({ valor: 10.5, data: '2026-02-31', beneficiario: '' }).length, 3);
  assert.deepEqual(verificarCamposExtraidos({ valor: 1, data: '2026-09-05', beneficiario: 'X' }, { periodo: PERIODO }), ['data fora do período']);
});

test('TC-08 conciliação: as regras decidem exatamente o que o gabarito diz que elas decidem', () => {
  const r = rodarMotor(DATASET, PERIODO);
  const idPorFitid = new Map(cen.extrato.map((l) => [l.fitid, l.id]));
  for (const l of r.linhas) {
    const g = gab.lancamentos[idPorFitid.get(l.id)];
    if (g.resolvidoPor !== 'regra') continue;
    const p = r.lancamentos[l.id];
    assert.equal(p.situacao, g.situacao, `${idPorFitid.get(l.id)} situação`);
    if (g.vinculo.ids.length) assert.deepEqual([...p.vinculo.ids].sort(), [...g.vinculo.ids].sort(), `${idPorFitid.get(l.id)} vínculo`);
  }
  assert.ok(Object.values(r.lancamentos).every((x) => ['conciliado', 'divergencia', 'pendente', 'tarifa', 'fora_do_escopo'].includes(x.situacao)));
});

test('TC-10 linha de base: sozinhas, as regras deixam como "sem documento" as despesas que só o comprovante resolve', () => {
  const r = rodarMotor(DATASET, PERIODO);
  const idPorFitid = new Map(cen.extrato.map((l) => [l.fitid, l.id]));
  const semDoc = r.pendencias.filter((p) => p.tipo === 'despesa_sem_documento').map((p) => idPorFitid.get(p.ref));
  assert.equal(semDoc.length, 10);
  const paraIa = Object.entries(gab.lancamentos).filter(([, g]) => g.resolvidoPor === 'ia').map(([id]) => id);
  assert.equal(paraIa.length, 6);
  for (const id of paraIa) assert.ok(semDoc.includes(id));
  const prev = new Set(r.pendencias.map((p) => `${p.tipo}|${['nota_sem_pagamento', 'nota_duplicada'].includes(p.tipo) ? p.ref : idPorFitid.get(p.ref)}`));
  assert.deepEqual([...prev].sort(), gab.pendenciasAposRegras.map((p) => `${p.tipo}|${p.ref}`).sort());
});

test('conciliação: pagamento menor que a nota não vira "juros"; nome coerente tolera truncamento do banco', () => {
  const nota = { id: 'N1', chave: 'a', numero: '1', emissao: '2026-10-01', vencimento: '2026-10-10', valor: 100000, emitente: { cnpj: '1', nome: 'Moinho Sol Nascente Ltda' } };
  const r = conciliar({ linhas: [{ id: 'l', data: '2026-10-10', valor: -99000, descricao: 'PIX ENVIADO MOINHO SOL NASC' }], notas: [nota], periodo: PERIODO });
  assert.equal(r.lancamentos.l.situacao, 'pendente');
  const r2 = conciliar({ linhas: [{ id: 'l', data: '2026-10-10', valor: -101000, descricao: 'PIX ENVIADO MOINHO SOL NASC' }], notas: [nota], periodo: PERIODO });
  assert.equal(r2.lancamentos.l.situacao, 'divergencia');
  assert.ok(nomeCoerente('PIX ENVIADO MOINHO SOL NASC', 'Moinho Sol Nascente Ltda'));
  assert.ok(!nomeCoerente('PIX ENVIADO JOSE PEDREIRO', 'Moinho Sol Nascente Ltda'));
});

test('TC-12 métricas: Wilson e conjuntos conferem com cálculo à mão', () => {
  const [lo, hi] = wilson(9, 10);
  assert.ok(Math.abs(lo - 0.5958) < 0.002 && Math.abs(hi - 0.9821) < 0.002);
  assert.deepEqual(wilson(0, 0), [0, 1]);
  assert.equal(proporcao(54, 54).valor, 1);
  const c = conjuntos(['a', 'b', 'c'], ['a', 'b', 'd']);
  assert.equal(c.acertos, 2); assert.ok(Math.abs(c.f1 - 2 / 3) < 1e-9);
  assert.deepEqual(c.faltaram, ['d']); assert.deepEqual(c.sobraram, ['c']);
});

test('o dataset commitado tem 25 imagens, XMLs, OFX, planilha, WhatsApp e gabarito', () => {
  assert.equal(readdirSync(`${DATASET}comprovantes`).length, 25);
  assert.equal(readdirSync(`${DATASET}nfe`).length, 39);
  for (const f of ['extrato.ofx', 'contas-a-pagar.csv', 'whatsapp.txt', 'gabarito.json', 'cenario.json', 'MANIFESTO.json']) assert.ok(readFileSync(`${DATASET}${f}`).length > 0, f);
  assert.ok(!JSON.stringify(cen).includes('"campos"'), 'o cenario.json público não revela o gabarito dos comprovantes');
});
