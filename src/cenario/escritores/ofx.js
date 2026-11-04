import { decimal } from '../../lib/dinheiro.js';

/** Extrato em OFX 1.x (SGML, como os bancos entregam: tags de folha sem fechamento). */
export function escreverOfx(cenario) {
  const { extrato, banco, meta } = cenario;
  const ymd = (iso) => iso.replace(/-/g, '');
  const trans = extrato.map((l) => `<STMTTRN>\n<TRNTYPE>${l.valor < 0 ? 'DEBIT' : 'CREDIT'}\n<DTPOSTED>${ymd(l.data)}120000[-3:BRT]\n<TRNAMT>${decimal(l.valor)}\n<FITID>${l.fitid}\n<MEMO>${l.descricao}\n</STMTTRN>`).join('\n');
  return [
    'OFXHEADER:100', 'DATA:OFXSGML', 'VERSION:102', 'SECURITY:NONE', 'ENCODING:USASCII', 'CHARSET:1252', 'COMPRESSION:NONE', 'OLDFILEUID:NONE', 'NEWFILEUID:NONE', '',
    `<!-- DOCUMENTO FICTICIO - Laboratorio de Fechamento - Theasier -->`,
    '<OFX>',
    '<SIGNONMSGSRSV1><SONRS><STATUS><CODE>0<SEVERITY>INFO</STATUS><DTSERVER>20261031120000[-3:BRT]<LANGUAGE>POR</SONRS></SIGNONMSGSRSV1>',
    '<BANKMSGSRSV1><STMTTRNRS><TRNUID>1<STATUS><CODE>0<SEVERITY>INFO</STATUS>',
    `<STMTRS><CURDEF>BRL<BANKACCTFROM><BANKID>999<BRANCHID>${banco.agencia}<ACCTID>${banco.conta}<ACCTTYPE>CHECKING</BANKACCTFROM>`,
    `<BANKTRANLIST><DTSTART>${ymd(`${meta.mes}-01`)}<DTEND>${ymd(`${meta.mes}-31`)}`,
    trans, '</BANKTRANLIST>', '</STMTRS></STMTTRNRS></BANKMSGSRSV1>', '</OFX>', '',
  ].join('\n');
}
