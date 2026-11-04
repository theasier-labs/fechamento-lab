// Sorteio com semente (determinístico): a mesma semente gera sempre a mesma sequência.
function hash(texto) {
  let h = 1779033703 ^ texto.length;
  for (let i = 0; i < texto.length; i++) {
    h = Math.imul(h ^ texto.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

/** Número de 32 bits estável para um texto (usado para dividir os conjuntos dev, calibração e teste). */
export const hashTexto = (texto) => hash(String(texto))();

export function criarPrng(semente) {
  let a = hash(String(semente))();
  const proximo = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = {
    proximo,
    /** Inteiro em [min, max], inclusive. */
    inteiro: (min, max) => min + Math.floor(proximo() * (max - min + 1)),
    escolher: (lista) => lista[Math.floor(proximo() * lista.length)],
    embaralhar(lista) {
      const c = [...lista];
      for (let i = c.length - 1; i > 0; i--) {
        const j = Math.floor(proximo() * (i + 1));
        [c[i], c[j]] = [c[j], c[i]];
      }
      return c;
    },
    /** Sequência independente, derivada desta semente e de um nome (cada parte do cenário tem a sua). */
    filho: (nome) => criarPrng(`${semente}/${nome}`),
  };
  return r;
}
