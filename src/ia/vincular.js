// A REGRA VERIFICA A IA: um comprovante só vira vínculo se o valor extraído bate EXATAMENTE com um lançamento
// ainda sem documento e a data está a até 3 dias dele. Qualquer outra coisa vai para a pessoa decidir.
const dias = (a, b) => Math.abs(Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000));

export function vincular(campos, lancamentosSemDocumento) {
  if (!campos?.legivel || !Number.isInteger(campos.valor_centavos) || !campos.data) return { resultado: 'revisao_humana', motivo: 'campos não confiáveis' };
  const cand = lancamentosSemDocumento.filter((l) => -l.valor === campos.valor_centavos && dias(l.data, campos.data) <= 3);
  if (cand.length === 1) return { resultado: 'vinculado', lancamento: cand[0].id };
  if (cand.length > 1) return { resultado: 'revisao_humana', motivo: 'mais de um lançamento possível' };
  return { resultado: 'revisao_humana', motivo: 'nenhum lançamento sem documento bate com o valor e a data' };
}
