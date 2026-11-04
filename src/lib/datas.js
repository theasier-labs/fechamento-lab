// Datas AAAA-MM-DD, sempre em UTC (sem fuso: o cenário é fictício e determinístico).
export const somarDias = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
export const diasEntre = (de, ate) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000);
export const brData = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
export const aamm = (iso) => `${iso.slice(2, 4)}${iso.slice(5, 7)}`;
export const limitar = (iso, min, max) => (iso < min ? min : iso > max ? max : iso);
export const ehValida = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso) && new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) === iso;
