// Gera o cenário em dataset/ (a mesma semente gera os mesmos dados estruturados).
// Imagens são gravadas com hash no manifesto (a renderização depende das fontes do sistema).
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { criarPrng } from '../src/lib/prng.js';
import { gerarCenario } from '../src/cenario/gerar.js';
import { escreverNfe } from '../src/cenario/escritores/nfe.js';
import { escreverOfx } from '../src/cenario/escritores/ofx.js';
import { renderizarComprovante } from '../src/cenario/escritores/comprovante.js';
import { escreverContasAPagar, escreverWhatsapp } from '../src/cenario/escritores/texto.js';

export function escreverDataset(destino, semente = 'aurora-2026-10') {
  const c = gerarCenario({ semente });
  rmSync(destino, { recursive: true, force: true });
  for (const sub of ['nfe', 'comprovantes']) mkdirSync(join(destino, sub), { recursive: true });
  const manifesto = {};
  const gravar = (rel, conteudo) => { writeFileSync(join(destino, rel), conteudo); manifesto[rel] = createHash('sha256').update(conteudo).digest('hex'); };
  gravar('extrato.ofx', escreverOfx(c));
  gravar('contas-a-pagar.csv', escreverContasAPagar(c));
  gravar('whatsapp.txt', escreverWhatsapp(c));
  for (const n of c.notas) gravar(`nfe/${n.id}.xml`, escreverNfe(n, c));
  gravar(`nfe/${c.notaDuplicada}-copia.xml`, escreverNfe(c.notas.find((n) => n.id === c.notaDuplicada), c)); // a nota duplicada
  const rimg = criarPrng(`${semente}/imagens`);
  for (const cv of c.comprovantes) gravar(`comprovantes/${cv.id}.jpg`, renderizarComprovante(cv, { cliente: c.cliente, prng: rimg.filho(cv.id) }));
  // entidades e gabarito
  const { gabarito, ...resto } = c;
  gravar('cenario.json', JSON.stringify({ meta: resto.meta, cliente: resto.cliente, escritorio: resto.escritorio, banco: resto.banco, fornecedores: resto.fornecedores, extrato: resto.extrato, comprovantes: resto.comprovantes.map(({ campos, linhaRef, injecao, adversarial, distrator, ...pub }) => pub) }, null, 2));
  gravar('gabarito.json', JSON.stringify(gabarito, null, 2));
  const estruturados = Object.fromEntries(Object.entries(manifesto).filter(([k]) => !k.endsWith('.jpg')));
  const imagens = Object.fromEntries(Object.entries(manifesto).filter(([k]) => k.endsWith('.jpg')));
  writeFileSync(join(destino, 'MANIFESTO.json'), JSON.stringify({ semente, aviso: 'DOCUMENTO FICTÍCIO', estruturados, imagens, nota: 'Os dados estruturados são idênticos byte a byte com a mesma semente. As imagens dependem das fontes do sistema: o hash vale para esta renderização.' }, null, 2));
  return { cenario: c, arquivos: readdirSync(destino) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = escreverDataset(new URL('../dataset', import.meta.url).pathname);
  console.log(`Cenário gerado em dataset/: ${r.cenario.notas.length} notas, ${r.cenario.extrato.length} lançamentos, ${r.cenario.comprovantes.length} comprovantes, ${r.cenario.mensagens.length} mensagens.`);
}
