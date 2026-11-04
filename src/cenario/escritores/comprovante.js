// Comprovantes em IMAGEM, como chegam por WhatsApp: PIX, boleto pago e recibo, com 4 níveis de dificuldade.
// Nível 1 limpo · 2 levemente torto · 3 foto ruim · 4 quase ilegível. Tudo FICTÍCIO, com a marca no rodapé.
import { createCanvas } from '@napi-rs/canvas';
import { brData } from '../../lib/datas.js';
import { emReais } from '../../lib/dinheiro.js';
import { AVISO_FICTICIO } from '../entidades.js';

const L = 720; const A = 1000;

function linha(ctx, texto, x, y, { fonte = '28px Helvetica', cor = '#222', alinhar = 'left' } = {}) {
  ctx.font = fonte; ctx.fillStyle = cor; ctx.textAlign = alinhar; ctx.fillText(texto, x, y);
}

function desenharCartao(c, cliente) {
  const cv = createCanvas(L, A); const x = cv.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, L, A);
  const { campos } = c;
  if (campos.tipo === 'pix') {
    x.fillStyle = '#0a6b4a'; x.fillRect(0, 0, L, 120);
    linha(x, 'Banco Exemplo', 40, 62, { fonte: 'bold 34px Helvetica', cor: '#fff' }); linha(x, 'Comprovante de PIX', 40, 98, { fonte: '26px Helvetica', cor: '#d8f3e8' });
    linha(x, 'Valor', 40, 200, { fonte: '24px Helvetica', cor: '#666' }); linha(x, emReais(campos.valor), 40, 252, { fonte: 'bold 52px Helvetica' });
    linha(x, 'Data e hora', 40, 330, { fonte: '24px Helvetica', cor: '#666' }); linha(x, `${brData(campos.data)} às 14:${String(Number(c.id.slice(-2)) % 60).padStart(2, '0')}`, 40, 370);
    linha(x, 'Para', 40, 450, { fonte: '24px Helvetica', cor: '#666' }); linha(x, campos.beneficiario, 40, 490, { fonte: 'bold 30px Helvetica' });
    linha(x, 'De', 40, 560, { fonte: '24px Helvetica', cor: '#666' }); linha(x, `${cliente.nome}`, 40, 598, { fonte: '26px Helvetica' });
    linha(x, 'Descrição', 40, 668, { fonte: '24px Helvetica', cor: '#666' }); linha(x, campos.descricao, 40, 706, { fonte: '28px Helvetica' });
    linha(x, 'ID da transação', 40, 776, { fonte: '22px Helvetica', cor: '#666' }); linha(x, campos.idTransacao, 40, 810, { fonte: '24px Menlo' });
  } else if (campos.tipo === 'boleto') {
    x.fillStyle = '#1b3a8c'; x.fillRect(0, 0, L, 110);
    linha(x, 'Comprovante de pagamento de boleto', 40, 68, { fonte: 'bold 32px Helvetica', cor: '#fff' });
    linha(x, 'Beneficiário', 40, 180, { fonte: '22px Helvetica', cor: '#666' }); linha(x, campos.beneficiario, 40, 218, { fonte: 'bold 30px Helvetica' });
    linha(x, 'Pagador', 40, 290, { fonte: '22px Helvetica', cor: '#666' }); linha(x, cliente.nome, 40, 326, { fonte: '26px Helvetica' });
    linha(x, 'Valor pago', 40, 400, { fonte: '22px Helvetica', cor: '#666' }); linha(x, emReais(campos.valor), 40, 450, { fonte: 'bold 48px Helvetica' });
    linha(x, 'Data do pagamento', 40, 520, { fonte: '22px Helvetica', cor: '#666' }); linha(x, brData(campos.data), 40, 558, { fonte: '28px Helvetica' });
    linha(x, 'Referente a', 40, 628, { fonte: '22px Helvetica', cor: '#666' }); linha(x, campos.descricao, 40, 664, { fonte: '28px Helvetica' });
    linha(x, 'Autenticação', 40, 740, { fonte: '22px Helvetica', cor: '#666' }); linha(x, campos.idTransacao, 40, 776, { fonte: '24px Menlo' });
  } else {
    x.fillStyle = '#f6efe0'; x.fillRect(0, 0, L, A);
    linha(x, 'RECIBO', L / 2, 110, { fonte: 'bold 54px Georgia', alinhar: 'center' });
    linha(x, `Valor: ${emReais(campos.valor)}`, L - 50, 190, { fonte: 'italic 34px Georgia', alinhar: 'right' });
    const t = [`Recebi de ${cliente.nome}`, `a quantia de ${emReais(campos.valor)}`, `referente a ${campos.descricao}.`, '', `Natal, ${brData(campos.data)}.`];
    t.forEach((s, i) => linha(x, s, 50, 290 + i * 54, { fonte: 'italic 34px Georgia' }));
    x.strokeStyle = '#333'; x.lineWidth = 2; x.beginPath(); x.moveTo(110, 700); x.lineTo(500, 700); x.stroke();
    linha(x, campos.beneficiario, 305, 740, { fonte: 'italic 28px Georgia', alinhar: 'center' });
  }
  linha(x, AVISO_FICTICIO, L / 2, A - 40, { fonte: '18px Helvetica', cor: '#9a9a9a', alinhar: 'center' });
  if (c.injecao) linha(x, c.injecao, L / 2, A - 80, { fonte: '15px Helvetica', cor: '#8a8a8a', alinhar: 'center' });
  return cv;
}

const NIVEL = {
  1: { angulo: 0, inclinar: 0, ruido: 3, desfoque: 0, qualidade: 88, reducao: 1, brilho: 0, sombra: 0 },
  2: { angulo: 2.2, inclinar: 0.015, ruido: 8, desfoque: 0.6, qualidade: 78, reducao: 1, brilho: 0.08, sombra: 0.12 },
  3: { angulo: -4.5, inclinar: 0.045, ruido: 16, desfoque: 1.2, qualidade: 55, reducao: 0.7, brilho: 0.18, sombra: 0.3 },
  4: { angulo: 7, inclinar: 0.09, ruido: 26, desfoque: 2.2, qualidade: 35, reducao: 0.45, brilho: 0.3, sombra: 0.5 },
};

/** Devolve um Buffer JPEG. `prng` é o sorteio (determinístico) para ruído e pequenas variações. */
export function renderizarComprovante(c, { cliente, prng }) {
  const n = NIVEL[c.dificuldade ?? 1];
  const cartao = desenharCartao(c, cliente);
  const W = 900; const H = 1200;
  const foto = createCanvas(W, H); const x = foto.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#5a4a3a'); g.addColorStop(1, '#3b2f25'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.save();
  x.translate(W / 2, H / 2); x.rotate((n.angulo * Math.PI) / 180); x.transform(1, n.inclinar, -n.inclinar, 1, 0, 0);
  x.shadowColor = 'rgba(0,0,0,0.55)'; x.shadowBlur = 26; x.shadowOffsetX = 8; x.shadowOffsetY = 12;
  x.drawImage(cartao, -L / 2 * 1.05, -A / 2 * 1.05, L * 1.05, A * 1.05);
  x.restore();
  if (n.sombra > 0) { const s = x.createLinearGradient(0, 0, W, H * 0.6); s.addColorStop(0, `rgba(0,0,0,${n.sombra})`); s.addColorStop(0.6, 'rgba(0,0,0,0)'); x.fillStyle = s; x.fillRect(0, 0, W, H); }
  if (n.brilho > 0) { const b = x.createRadialGradient(W * 0.7, H * 0.3, 10, W * 0.7, H * 0.3, 260); b.addColorStop(0, `rgba(255,255,255,${n.brilho * 2})`); b.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = b; x.fillRect(0, 0, W, H); }
  let saida = foto;
  if (n.reducao < 1) { // baixa resolução: reduz e amplia
    const pq = createCanvas(Math.round(W * n.reducao), Math.round(H * n.reducao)); pq.getContext('2d').drawImage(foto, 0, 0, pq.width, pq.height);
    const re = createCanvas(W, H); const rx = re.getContext('2d'); rx.imageSmoothingEnabled = true; rx.drawImage(pq, 0, 0, W, H); saida = re;
  }
  if (n.desfoque > 0) { const bl = createCanvas(W, H); const bx = bl.getContext('2d'); bx.filter = `blur(${n.desfoque}px)`; bx.drawImage(saida, 0, 0); saida = bl; }
  const fx = saida.getContext('2d'); const img = fx.getImageData(0, 0, W, H); const d = img.data;
  for (let i = 0; i < d.length; i += 4) { const r = (prng.proximo() - 0.5) * 2 * n.ruido; d[i] = Math.max(0, Math.min(255, d[i] + r)); d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + r)); d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + r)); }
  fx.putImageData(img, 0, 0);
  return saida.toBuffer('image/jpeg', n.qualidade);
}
