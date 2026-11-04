// Lê uma pasta de cenário (arquivos) e roda o motor por regras.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { conciliar } from './conciliar.js';
import { lerNfe } from './nfe.js';
import { lerOfx } from './ofx.js';
import { verificarNota } from './verificar.js';

const idDaNota = (arq) => arq.replace(/\.xml$/i, '').replace(/-copia$/i, '');
const ehCopia = (arq) => /-copia\.xml$/i.test(arq);

export function lerCenario(pasta) {
  const ofx = lerOfx(readFileSync(join(pasta, 'extrato.ofx'), 'latin1'));
  const arquivos = readdirSync(join(pasta, 'nfe')).filter((a) => a.endsWith('.xml')).sort((a, b) => Number(ehCopia(a)) - Number(ehCopia(b)) || a.localeCompare(b));
  const notas = []; const problemasNfe = []; const verificacoes = [];
  for (const a of arquivos) {
    const { nota, problemas } = lerNfe(readFileSync(join(pasta, 'nfe', a), 'utf8'), a);
    problemasNfe.push(...problemas);
    if (nota) { nota.id = idDaNota(a); nota.copia = ehCopia(a); notas.push(nota); verificacoes.push(...verificarNota(nota)); }
  }
  return { linhas: ofx.linhas, problemasOfx: ofx.problemas, notas, problemasNfe, verificacoes };
}

export function rodarMotor(pasta, periodo = { inicio: '2026-10-01', fim: '2026-10-31' }) {
  const c = lerCenario(pasta);
  const r = conciliar({ linhas: c.linhas, notas: c.notas, periodo });
  return { ...c, ...r };
}
