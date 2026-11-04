// Conciliação por REGRAS, todas visíveis: cada vínculo diz qual regra o decidiu e com que confiança.
//  R1 valor igual + janela de datas + nome coerente  → provável (0,95)
//  R2 valor igual + janela de datas                   → possível (0,70)
//  R4 soma de duas notas do mesmo emitente = valor    → agrupado (0,80)
//  R3 pagamento até 2 % MAIOR que a nota (juros/multa) + nome coerente, nota de vencimento mais próximo → divergência (0,60)
// O que sobra vira pendência. A IA só entra depois, para o que a regra não resolve.
const SEM_ACENTO = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const IGNORAR = new Set(['LTDA', 'EIRELI', 'DISTRIBUIDORA', 'FICTICIA', 'SERVICOS', 'COMERCIO', 'TRANSPORTES']);
const tokens = (t) => SEM_ACENTO(t).replace(/[^A-Z ]/g, ' ').split(/\s+/).filter((x) => x.length >= 4 && !IGNORAR.has(x));
const TARIFA = /\b(TARIFA|IOF|ANUIDADE|TAXA BANC|JUROS CHEQUE)\b/;

export function nomeCoerente(descricao, nomeEmitente) {
  const d = tokens(descricao); const e = tokens(nomeEmitente).slice(0, 3);
  return d.some((a) => e.some((b) => b.startsWith(a) || a.startsWith(b)));
}

const diasEntre = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
const naJanela = (data, n) => data >= n.emissao && diasEntre(n.vencimento ?? n.emissao, data) <= 7;

export function conciliar({ linhas, notas, periodo }) {
  const resultado = {}; const pendencias = [];
  // notas repetidas (mesma chave): a primeira vale, as outras viram pendência
  const vistas = new Map(); const unicas = []; const notasDuplicadas = [];
  for (const n of notas) { if (vistas.has(n.chave)) { notasDuplicadas.push(n); pendencias.push({ tipo: 'nota_duplicada', ref: vistas.get(n.chave).id ?? vistas.get(n.chave).arquivo, descricao: `NF ${n.numero} (${n.emitente.nome}) aparece duas vezes nos XMLs`, valor: n.valor, data: n.emissao }); } else { vistas.set(n.chave, n); unicas.push(n); } }
  const livres = new Set(unicas);
  const define = (l, r) => { resultado[l.id] = r; };

  const pagamentos = [];
  for (const l of [...linhas].sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id))) {
    if (l.valor > 0) { define(l, { situacao: 'fora_do_escopo', categoria: 'recebimento', regra: null }); continue; }
    if (TARIFA.test(SEM_ACENTO(l.descricao))) { define(l, { situacao: 'tarifa', categoria: 'tarifa', regra: null }); continue; }
    pagamentos.push(l);
  }
  let restantes = [];
  // R1 e R2
  for (const l of pagamentos) {
    const v = -l.valor;
    const cand = [...livres].filter((n) => n.valor === v && naJanela(l.data, n));
    if (cand.length === 0) { restantes.push(l); continue; }
    const coerentes = cand.filter((n) => nomeCoerente(l.descricao, n.emitente.nome));
    const pool = coerentes.length ? coerentes : cand;
    pool.sort((a, b) => Math.abs(diasEntre(a.vencimento ?? a.emissao, l.data)) - Math.abs(diasEntre(b.vencimento ?? b.emissao, l.data)));
    const n = pool[0]; livres.delete(n);
    define(l, { situacao: 'conciliado', categoria: 'pagamento_fornecedor', regra: coerentes.length ? 'R1' : 'R2', confianca: coerentes.length ? 0.95 : 0.7, vinculo: { tipo: 'nota', ids: [n.id ?? n.arquivo] } });
  }
  // R4: duas notas do mesmo emitente somam o pagamento
  const aindaSem = [];
  for (const l of restantes) {
    const v = -l.valor; let achou = null;
    const lista = [...livres];
    for (let i = 0; i < lista.length && !achou; i++) for (let j = i + 1; j < lista.length && !achou; j++) {
      const a = lista[i]; const b = lista[j];
      if (a.emitente.cnpj === b.emitente.cnpj && a.valor + b.valor === v && naJanela(l.data, a) && naJanela(l.data, b)) achou = [a, b];
    }
    if (achou) { achou.forEach((n) => livres.delete(n)); define(l, { situacao: 'conciliado', categoria: 'pagamento_fornecedor', regra: 'R4', confianca: 0.8, vinculo: { tipo: 'notas', ids: achou.map((n) => n.id ?? n.arquivo) } }); } else aindaSem.push(l);
  }
  // duplicidade de pagamento: mesma descrição e valor de um pagamento já conciliado, até 3 dias antes
  const apos = [];
  for (const l of aindaSem) {
    const original = pagamentos.find((o) => o.id !== l.id && resultado[o.id]?.situacao === 'conciliado' && o.descricao === l.descricao && o.valor === l.valor && diasEntre(o.data, l.data) >= 0 && diasEntre(o.data, l.data) <= 3);
    if (original) { define(l, { situacao: 'pendente', categoria: 'pagamento_fornecedor', motivo: 'pagamento_duplicado', regra: 'duplicidade', duplicaDe: original.id }); pendencias.push({ tipo: 'pagamento_duplicado', ref: l.id, descricao: `${l.descricao}: possível pagamento em duplicidade`, valor: -l.valor, data: l.data }); } else apos.push(l);
  }
  // R3: valor até 2 % diferente com nome coerente
  const sobra = [];
  for (const l of apos) {
    const v = -l.valor;
    // Juros e multa fazem o pagamento ficar MAIOR que a nota (até 2 %); pagar menos não é juros. Prefere a nota de vencimento mais próximo.
    const n = [...livres].filter((x) => nomeCoerente(l.descricao, x.emitente.nome) && naJanela(l.data, x) && v > x.valor && v - x.valor <= x.valor * 0.02)
      .sort((a, b) => Math.abs(diasEntre(a.vencimento ?? a.emissao, l.data)) - Math.abs(diasEntre(b.vencimento ?? b.emissao, l.data)) || (v - a.valor) - (v - b.valor))[0];
    if (n) { livres.delete(n); define(l, { situacao: 'divergencia', categoria: 'pagamento_fornecedor', motivo: 'valor_diferente', regra: 'R3', confianca: 0.6, vinculo: { tipo: 'nota', ids: [n.id ?? n.arquivo] } }); pendencias.push({ tipo: 'divergencia_valor', ref: l.id, descricao: `${l.descricao}: valor difere da nota`, valor: v, data: l.data }); } else sobra.push(l);
  }
  for (const l of sobra) { define(l, { situacao: 'pendente', categoria: 'despesa_sem_nota', motivo: 'sem_nota', regra: null }); pendencias.push({ tipo: 'despesa_sem_documento', ref: l.id, descricao: `${l.descricao}: sem documento`, valor: -l.valor, data: l.data }); }
  // notas sem pagamento
  const notasSemPagamento = [];
  for (const n of livres) if (n.vencimento && n.vencimento <= periodo.fim) { notasSemPagamento.push(n); pendencias.push({ tipo: 'nota_sem_pagamento', ref: n.id ?? n.arquivo, descricao: `${n.emitente.nome} NF ${n.numero}: vencida em ${n.vencimento} sem pagamento no extrato`, valor: n.valor, data: n.vencimento }); }
  return { lancamentos: resultado, pendencias, notasSemPagamento, notasDuplicadas, aVencer: [...livres].filter((n) => !(n.vencimento && n.vencimento <= periodo.fim)) };
}
