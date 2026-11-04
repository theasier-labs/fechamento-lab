// Chave de acesso da NF-e: 44 dígitos = cUF(2) AAMM(4) CNPJ(14) mod(2) série(3) nNF(9) tpEmis(1) cNF(8) cDV(1).
// O dígito verificador usa módulo 11 com pesos de 2 a 9, da direita para a esquerda.
export function digitoChave(quarentaETres) {
  const d = String(quarentaETres).split('').map(Number).reverse();
  const soma = d.reduce((s, x, i) => s + x * (2 + (i % 8)), 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function montarChave({ uf, aamm, cnpj, modelo = '55', serie, numero, tpEmis = '1', codigo }) {
  const corpo = `${String(uf).padStart(2, '0')}${aamm}${cnpj}${modelo}${String(serie).padStart(3, '0')}${String(numero).padStart(9, '0')}${tpEmis}${String(codigo).padStart(8, '0')}`;
  if (corpo.length !== 43) throw new Error(`Chave com ${corpo.length} dígitos antes do verificador`);
  return `${corpo}${digitoChave(corpo)}`;
}

export function validarChave(chave) {
  const c = String(chave ?? '').replace(/\D/g, '');
  return c.length === 44 && digitoChave(c.slice(0, 43)) === Number(c[43]);
}

/** Lê os campos de uma chave válida em formato. */
export function lerChave(chave) {
  const c = String(chave).replace(/\D/g, '');
  if (c.length !== 44) return null;
  return { uf: c.slice(0, 2), aamm: c.slice(2, 6), cnpj: c.slice(6, 20), modelo: c.slice(20, 22), serie: c.slice(22, 25), numero: c.slice(25, 34), tpEmis: c[34], codigo: c.slice(35, 43), dv: c[43] };
}
