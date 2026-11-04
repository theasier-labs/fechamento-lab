// Leitor de NF-e (modelo 55) em XML: extrai o que a conferência usa e reporta o que faltar.
import { XMLParser } from 'fast-xml-parser';
import { paraCentavos } from '../lib/dinheiro.js';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', removeNSPrefix: true, parseTagValue: false, parseAttributeValue: false, trimValues: true, isArray: (nome) => nome === 'det' || nome === 'dup' });
const money = (v) => (v == null ? null : paraCentavos(String(v)));

export function lerNfe(xml, arquivo = '') {
  const problemas = [];
  let doc;
  try { doc = parser.parse(String(xml)); } catch (e) { return { nota: null, problemas: [{ arquivo, motivo: `XML malformado (${e.message.slice(0, 80)})` }] }; }
  const inf = doc?.nfeProc?.NFe?.infNFe ?? doc?.NFe?.infNFe;
  if (!inf) return { nota: null, problemas: [{ arquivo, motivo: 'Não é uma NF-e (infNFe ausente)' }] };
  const prot = doc?.nfeProc?.protNFe?.infProt;
  const chave = (prot?.chNFe ?? String(inf['@_Id'] ?? '').replace(/^NFe/, '')) || null;
  const itens = (inf.det ?? []).map((d) => ({ descricao: d.prod?.xProd ?? '', quantidade: Number(d.prod?.qCom ?? 0), valor: money(d.prod?.vProd) }));
  const nota = {
    arquivo, chave, numero: inf.ide?.nNF ?? null, serie: inf.ide?.serie ?? null, emissao: String(inf.ide?.dhEmi ?? '').slice(0, 10) || null,
    emitente: { cnpj: inf.emit?.CNPJ ?? null, nome: inf.emit?.xNome ?? '' }, destinatario: { cnpj: inf.dest?.CNPJ ?? null, nome: inf.dest?.xNome ?? '' },
    itens, valor: money(inf.total?.ICMSTot?.vNF), vencimento: inf.cobr?.dup?.[0]?.dVenc ?? null,
  };
  for (const [k, v] of [['chave', nota.chave], ['número', nota.numero], ['emissão', nota.emissao], ['CNPJ do emitente', nota.emitente.cnpj], ['valor total', nota.valor]]) if (v == null || v === '') problemas.push({ arquivo, motivo: `Campo ausente: ${k}` });
  return { nota, problemas };
}
