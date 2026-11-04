// Métricas honestas: sempre com intervalo de confiança.

/** Intervalo de Wilson (95 %) para uma proporção k de n. Devolve [baixo, alto] em 0..1. */
export function wilson(k, n, z = 1.96) {
  if (n === 0) return [0, 1];
  const p = k / n; const z2 = z * z;
  const centro = (p + z2 / (2 * n)) / (1 + z2 / n);
  const margem = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return [Math.max(0, centro - margem), Math.min(1, centro + margem)];
}

export const proporcao = (k, n) => ({ k, n, valor: n ? k / n : null, ic95: wilson(k, n) });

/** Precisão, revocação e F1 entre dois conjuntos de chaves. */
export function conjuntos(previsto, esperado) {
  const P = new Set(previsto); const E = new Set(esperado);
  const acertos = [...P].filter((x) => E.has(x)).length;
  const precisao = P.size ? acertos / P.size : 1; const revocacao = E.size ? acertos / E.size : 1;
  const f1 = precisao + revocacao ? (2 * precisao * revocacao) / (precisao + revocacao) : 0;
  return { acertos, previstos: P.size, esperados: E.size, precisao, revocacao, f1, faltaram: [...E].filter((x) => !P.has(x)), sobraram: [...P].filter((x) => !E.has(x)) };
}
