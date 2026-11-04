import assert from 'node:assert/strict';
import { test } from 'node:test';
import { criarFerramentas, investigar } from '../src/ia/agente.js';
import { ProvedorFalso } from '../src/ia/provedor.js';
import { checar } from '../src/ia/redator.js';

const dados = { extrato: [{ id: 'L001', data: '2026-10-05', descricao: 'PIX X', valor: -18000 }, { id: 'L002', data: '2026-10-06', descricao: 'PIX X', valor: -18000 }], notas: [], mensagens: [{ id: 'M001', texto: 'paguei o moinho' }], pendencias: [] };
const F = criarFerramentas(dados);

test('TC-16a ferramentas são só leitura e devolvem erro claro quando não acham', () => {
  assert.equal(F.ver_lancamento({ id: 'L001' }).valor, 'R$ -180,00');
  assert.ok(F.ver_lancamento({ id: 'L999' }).erro);
  assert.equal(F.buscar_lancamentos_parecidos({ id: 'L001' })[0].id, 'L002');
  assert.equal(F.buscar_mensagens({ termo: 'MOINHO' })[0].id, 'M001');
});

test('TC-16b agente: usa ferramenta, depois conclui; evidência inventada é descartada pela regra', async () => {
  const roteiro = [{ passo: 'usar_ferramenta', ferramenta: 'buscar_lancamentos_parecidos', argumento: 'L002', acao: null, evidencias: [], justificativa: null }, { passo: 'concluir', ferramenta: null, argumento: null, acao: 'verificar_pagamento_duplicado', evidencias: ['L001', 'L002'], justificativa: 'igual' }];
  let i = 0; const prov = new ProvedorFalso(() => roteiro[i++]);
  const r = await investigar({ provedor: prov, modelo: 'm', pendencia: { tipo: 'pagamento_duplicado', ref: 'L002' }, ferramentas: F });
  assert.equal(r.proposta.acao, 'verificar_pagamento_duplicado'); assert.equal(r.trilha.length, 1);
  roteiro[1] = { ...roteiro[1], evidencias: ['L777'] }; i = 0;
  const r2 = await investigar({ provedor: new ProvedorFalso(() => roteiro[i++]), modelo: 'm', pendencia: { tipo: 'pagamento_duplicado', ref: 'L002' }, ferramentas: F });
  assert.equal(r2.proposta, null); assert.match(r2.motivo, /L777/);
});

test('TC-16c redator: a lista de checagem barra valor inventado, CNPJ, markdown e item faltando', () => {
  const itens = [{ data: '2026-10-21', descricao: 'PIX', valor: -18000 }];
  assert.deepEqual(checar('Olá! Faltou o comprovante do PIX de 21/10, R$ 180,00. Pode enviar?', itens), []);
  assert.ok(checar('Faltou o PIX de R$ 181,00 de 21/10.', itens).some((f) => /valor não autorizado/.test(f)));
  assert.ok(checar('Faltou o PIX de 22/10, R$ 180,00.', itens).some((f) => /data não autorizada/.test(f)));
  assert.ok(checar('Faltou o PIX de 21/10.', itens).some((f) => /item ausente/.test(f)));
  assert.ok(checar('**Faltou** PIX 21/10 R$ 180,00', itens).some((f) => /markdown/.test(f)));
  assert.ok(checar('PIX 21/10 R$ 180,00, CNPJ 12.345.678/0001-95', itens).some((f) => /CNPJ/.test(f)));
});
