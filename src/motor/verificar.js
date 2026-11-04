// Verificações ARITMÉTICAS (nunca tributárias): dígitos, soma, coerência entre campos.
import { lerChave, validarChave } from '../lib/chave.js';
import { ehValida } from '../lib/datas.js';
import { validarCnpj } from '../lib/cnpj.js';

export function verificarNota(n) {
  const achados = [];
  const add = (codigo, mensagem) => achados.push({ codigo, mensagem, nota: n.arquivo || n.numero });
  if (!validarCnpj(n.emitente?.cnpj)) add('cnpj_emitente_invalido', 'CNPJ do emitente com dígito verificador inválido');
  if (n.destinatario?.cnpj && !validarCnpj(n.destinatario.cnpj)) add('cnpj_destinatario_invalido', 'CNPJ do destinatário com dígito verificador inválido');
  if (!validarChave(n.chave)) add('chave_invalida', 'Chave de acesso com dígito verificador inválido');
  else {
    const c = lerChave(n.chave);
    if (c.cnpj !== String(n.emitente?.cnpj ?? '').replace(/\D/g, '')) add('chave_incoerente_cnpj', 'O CNPJ dentro da chave não é o do emitente');
    if (Number(c.numero) !== Number(n.numero)) add('chave_incoerente_numero', 'O número dentro da chave não é o da nota');
  }
  const soma = (n.itens ?? []).reduce((s, i) => s + (i.valor ?? 0), 0);
  if (n.itens?.length && soma !== n.valor) add('soma_nao_fecha', `Soma dos itens (${soma}) diferente do total (${n.valor})`);
  if (!ehValida(n.emissao ?? '')) add('data_invalida', 'Data de emissão inválida');
  return achados;
}

/** Valida valores extraídos pela IA com as mesmas regras: devolve o que não passou (usado pela cascata). */
export function verificarCamposExtraidos(campos, { periodo } = {}) {
  const falhas = [];
  if (!(Number.isInteger(campos?.valor) && campos.valor > 0)) falhas.push('valor ausente ou não é inteiro em centavos');
  if (!ehValida(campos?.data ?? '')) falhas.push('data inválida');
  else if (periodo && (campos.data < periodo.inicio || campos.data > periodo.fim)) falhas.push('data fora do período');
  if (!campos?.beneficiario) falhas.push('beneficiário ausente');
  return falhas;
}
