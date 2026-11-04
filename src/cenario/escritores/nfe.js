import { decimal } from '../../lib/dinheiro.js';

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * NF-e modelo 55 em um subconjunto do leiaute 4.00 (nfeProc > NFe > infNFe + protNFe).
 * É FICTÍCIA. A validação contra o XSD oficial é uma tarefa em aberto do projeto (ponto a confirmar).
 */
export function escreverNfe(nota, cenario) {
  const dh = `${nota.emissao}T09:00:00-03:00`;
  const itens = nota.itens.map((it, i) => {
    const unit = (it.valor / 100 / it.quantidade).toFixed(4);
    return `<det nItem="${i + 1}"><prod><cProd>${String(i + 1).padStart(4, '0')}</cProd><cEAN>SEM GTIN</cEAN><xProd>${esc(it.descricao)}</xProd><NCM>00000000</NCM><CFOP>1102</CFOP><uCom>UN</uCom><qCom>${it.quantidade.toFixed(4)}</qCom><vUnCom>${unit}</vUnCom><vProd>${decimal(it.valor)}</vProd><cEANTrib>SEM GTIN</cEANTrib><uTrib>UN</uTrib><qTrib>${it.quantidade.toFixed(4)}</qTrib><vUnTrib>${unit}</vUnTrib><indTot>1</indTot></prod></det>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- DOCUMENTO FICTICIO - Laboratorio de Fechamento - Theasier -->
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe${nota.chave}" versao="4.00"><ide><cUF>24</cUF><cNF>${nota.chave.slice(35, 43)}</cNF><natOp>Compra para comercializacao</natOp><mod>55</mod><serie>${nota.serie}</serie><nNF>${nota.numero}</nNF><dhEmi>${dh}</dhEmi><tpNF>0</tpNF><idDest>1</idDest><tpImp>1</tpImp><tpEmis>1</tpEmis><cDV>${nota.chave[43]}</cDV><tpAmb>2</tpAmb><finNFe>1</finNFe></ide><emit><CNPJ>${nota.emitente.cnpj}</CNPJ><xNome>${esc(nota.emitente.nome)}</xNome></emit><dest><CNPJ>${nota.destinatario.cnpj}</CNPJ><xNome>${esc(nota.destinatario.nome)}</xNome></dest>${itens}<total><ICMSTot><vProd>${decimal(nota.valor)}</vProd><vNF>${decimal(nota.valor)}</vNF></ICMSTot></total><pag><detPag><tPag>15</tPag><vPag>${decimal(nota.valor)}</vPag></detPag></pag><cobr><dup><nDup>001</nDup><dVenc>${nota.vencimento}</dVenc><vDup>${decimal(nota.valor)}</vDup></dup></cobr><infAdic><infCpl>DOCUMENTO FICTICIO - Laboratorio de Fechamento - Theasier</infCpl></infAdic></infNFe></NFe><protNFe versao="4.00"><infProt><tpAmb>2</tpAmb><chNFe>${nota.chave}</chNFe><dhRecbto>${dh}</dhRecbto><nProt>${String(nota.numero).padStart(15, '9')}</nProt><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe></nfeProc>
`;
}
