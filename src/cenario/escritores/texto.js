import { brData } from '../../lib/datas.js';
import { reais } from '../../lib/dinheiro.js';

/** Planilha de contas a pagar do cliente (CSV; separador ponto e vírgula; formatos brasileiros). */
export function escreverContasAPagar(cenario) {
  const linhas = cenario.contasAPagar.map((c) => [c.fornecedor, c.descricao, brData(c.vencimento), reais(c.valor), c.pago].join(';'));
  return ['Fornecedor;Descrição;Vencimento;Valor;Pago', ...linhas, '', 'DOCUMENTO FICTÍCIO · Laboratório de Fechamento · Theasier', ''].join('\n');
}

/** Exportação de conversa do WhatsApp: "[DD/MM/AAAA HH:MM] Autor: texto". */
export function escreverWhatsapp(cenario) {
  return [...cenario.mensagens.map((m) => `[${brData(m.data)} ${m.hora}] ${m.autor}: ${m.texto}`), '', 'DOCUMENTO FICTÍCIO · Laboratório de Fechamento · Theasier', ''].join('\n');
}
