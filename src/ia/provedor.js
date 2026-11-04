// Provedor de modelos via OpenRouter (API compatível com OpenAI). A chave NUNCA é impressa nem gravada em log.
// Cache por hash do pedido: repetir o mesmo pedido reproduz a resposta sem custo (e sem rede).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function lerChave() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY.trim();
  const f = join(homedir(), '.theasier', 'openrouter-key');
  return existsSync(f) ? readFileSync(f, 'utf8').trim() : null;
}

const hash = (o) => createHash('sha256').update(JSON.stringify(o)).digest('hex');

export class ProvedorOpenRouter {
  constructor({ chave = lerChave(), pastaCache = new URL('../../cache-ia/', import.meta.url).pathname, fetchImpl = fetch } = {}) {
    this.chave = chave; this.pastaCache = pastaCache; this.fetch = fetchImpl; this.gasto = 0;
  }

  /** mensagens: formato chat; esquema: JSON Schema opcional (saída estruturada). Devolve { texto, json, uso, custo, ms, doCache }. */
  async chamar({ modelo, mensagens, esquema = null, temperatura = 0, maxTokens = 800, rotulo = null }) {
    const corpo = { model: modelo, messages: mensagens, temperature: temperatura, max_tokens: maxTokens, usage: { include: true } };
    if (rotulo) corpo.user = rotulo; // distingue repetições no cache e no painel do provedor
    if (esquema) { corpo.response_format = { type: 'json_schema', json_schema: { name: 'saida', strict: true, schema: esquema } }; corpo.provider = { require_parameters: true }; }
    const h = hash(corpo); const arq = join(this.pastaCache, `${h}.json`);
    if (existsSync(arq)) return { ...JSON.parse(readFileSync(arq, 'utf8')), doCache: true };
    if (!this.chave) throw new Error('Chave do OpenRouter ausente (OPENROUTER_API_KEY ou ~/.theasier/openrouter-key)');
    const t0 = Date.now();
    let r;
    for (let tentativa = 0; tentativa < 4; tentativa++) { // 429 e 5xx são do provedor, não do pedido: espera e tenta de novo
      r = await this.fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${this.chave}`, 'Content-Type': 'application/json', 'X-Title': 'Laboratorio de Fechamento' }, body: JSON.stringify(corpo) });
      if (r.status !== 429 && r.status < 500) break;
      await new Promise((ok) => setTimeout(ok, 1500 * 2 ** tentativa));
    }
    if (r.status === 402) throw new Error('Limite de gasto da chave esgotado (402)');
    if (!r.ok) throw new Error(`OpenRouter respondeu ${r.status}: ${(await r.text()).slice(0, 200).replace(this.chave, '***')}`);
    const d = await r.json();
    const texto = d.choices?.[0]?.message?.content ?? '';
    let json = null; if (esquema) { try { json = JSON.parse(texto); } catch { json = null; } }
    const saida = { texto, json, uso: d.usage ?? null, custo: d.usage?.cost ?? 0, ms: Date.now() - t0, modelo };
    this.gasto += saida.custo;
    mkdirSync(this.pastaCache, { recursive: true }); writeFileSync(arq, JSON.stringify(saida));
    return { ...saida, doCache: false };
  }
}

/** Provedor de teste: responde com uma função fornecida, sem rede. */
export class ProvedorFalso {
  constructor(responder) { this.responder = responder; this.chamadas = []; this.gasto = 0; }
  async chamar(pedido) { this.chamadas.push(pedido); const r = await this.responder(pedido); return { texto: JSON.stringify(r), json: r, uso: null, custo: 0, ms: 0, doCache: false, modelo: pedido.modelo }; }
}
