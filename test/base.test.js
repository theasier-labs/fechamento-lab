import assert from 'node:assert/strict';
import { test } from 'node:test';
import { digitoChave, lerChave, montarChave, validarChave } from '../src/lib/chave.js';
import { gerarCnpj, formatarCnpj, validarCnpj } from '../src/lib/cnpj.js';
import { emReais, paraCentavos, reais } from '../src/lib/dinheiro.js';
import { criarPrng, hashTexto } from '../src/lib/prng.js';

test('TC-01 PRNG: mesma semente, mesma sequência; sementes diferentes divergem; filhos são independentes e estáveis', () => {
  const a = criarPrng('x'); const b = criarPrng('x'); const c = criarPrng('y');
  const sa = Array.from({ length: 8 }, () => a.proximo());
  assert.deepEqual(sa, Array.from({ length: 8 }, () => b.proximo()));
  assert.notDeepEqual(sa, Array.from({ length: 8 }, () => c.proximo()));
  assert.equal(criarPrng('x').filho('notas').inteiro(0, 1e6), criarPrng('x').filho('notas').inteiro(0, 1e6));
  assert.notEqual(criarPrng('x').filho('notas').inteiro(0, 1e6), criarPrng('x').filho('banco').inteiro(0, 1e6));
  const r = criarPrng('z');
  for (let i = 0; i < 500; i++) { const n = r.inteiro(3, 7); assert.ok(n >= 3 && n <= 7); }
  assert.deepEqual(criarPrng('k').embaralhar([1, 2, 3, 4, 5]), criarPrng('k').embaralhar([1, 2, 3, 4, 5]));
  assert.equal(hashTexto('abc'), hashTexto('abc'));
});

test('TC-02 CNPJ: gerado é válido e formatado; alterar um dígito reprova; conhecidos válidos e inválidos', () => {
  const r = criarPrng('cnpj');
  for (let i = 0; i < 200; i++) assert.equal(validarCnpj(gerarCnpj(r)), true);
  const c = gerarCnpj(r);
  const errado = c.slice(0, 5) + String((Number(c[5]) + 1) % 10) + c.slice(6);
  assert.equal(validarCnpj(errado), false);
  assert.match(formatarCnpj(c), /^\d{2}\.\d{3}\.\d{3}\/0001-\d{2}$/);
  assert.equal(validarCnpj('11.222.333/0001-81'), true); // exemplo clássico de cálculo
  assert.equal(validarCnpj('00000000000000'), false);
  assert.equal(validarCnpj('123'), false);
});

test('TC-03 Chave de 44 dígitos: monta, valida e lê; alterar um dígito reprova', () => {
  const chave = montarChave({ uf: 24, aamm: '2610', cnpj: '11222333000181', serie: 1, numero: 42, codigo: 12345678 });
  assert.equal(chave.length, 44);
  assert.equal(validarChave(chave), true);
  assert.equal(lerChave(chave).numero, '000000042');
  assert.equal(lerChave(chave).cnpj, '11222333000181');
  const errada = chave.slice(0, 20) + String((Number(chave[20]) + 1) % 10) + chave.slice(21);
  assert.equal(validarChave(errada), false);
  assert.equal(validarChave('123'), false);
  assert.equal(digitoChave('0'.repeat(43)), 0);
});

test('dinheiro: centavos, formatação brasileira e leitura', () => {
  assert.equal(reais(123456), '1.234,56');
  assert.equal(reais(-5), '-0,05');
  assert.equal(emReais(1000000), 'R$ 10.000,00');
  assert.equal(paraCentavos('1.234,56'), 123456);
  assert.equal(paraCentavos('R$ 89,9'), 8990);
  assert.equal(paraCentavos('1234.5'), 123450);
  assert.equal(paraCentavos('-10,00'), -1000);
  assert.equal(paraCentavos('abc'), null);
});
