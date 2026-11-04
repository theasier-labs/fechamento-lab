// CNPJ fictício: dígitos verificadores válidos, gerados com semente. NENHUM é de empresa real por construção
// (a conferência contra base pública é uma tarefa de verificação do projeto). Todo documento leva "FICTÍCIO".
const PESOS1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function digito(digitos, pesos) {
  const soma = digitos.reduce((s, d, i) => s + d * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export const apenasDigitos = (t) => String(t ?? '').replace(/\D/g, '');

export function validarCnpj(valor) {
  const c = apenasDigitos(valor);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const d = c.split('').map(Number);
  return digito(d.slice(0, 12), PESOS1) === d[12] && digito(d.slice(0, 13), PESOS2) === d[13];
}

export function gerarCnpj(prng) {
  let base;
  do {
    base = Array.from({ length: 8 }, () => prng.inteiro(0, 9));
  } while (new Set(base).size === 1);
  const doze = [...base, 0, 0, 0, 1];
  const d1 = digito(doze, PESOS1);
  const d2 = digito([...doze, d1], PESOS2);
  return [...doze, d1, d2].join('');
}

export const formatarCnpj = (c) => apenasDigitos(c).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
