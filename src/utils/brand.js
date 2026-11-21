// Marca blanca: el color del proyecto reemplaza el azul por defecto en toda la app.
// Tailwind lee "primary" y "primary-container" desde estas variables CSS.

const hexToRgb = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Versión más clara para fondos/contenedores (mezcla con blanco)
const lighten = ([r, g, b], amount) => [r, g, b].map(c => Math.round(c + (255 - c) * amount));

export function applyBrand(marca) {
  const rgb = hexToRgb(marca?.color) || [0, 35, 111];
  const root = document.documentElement;
  root.style.setProperty('--brand-rgb', rgb.join(' '));
  root.style.setProperty('--brand-strong-rgb', lighten(rgb, 0.18).join(' '));
  root.style.setProperty('--brand', `rgb(${rgb.join(' ')})`);
}

// Iniciales para el monograma cuando no hay logo
export const brandInitials = (name = '') => {
  const words = name.replace(/\bS\.?\s?A\.?\s?S\.?/gi, '').split(/\s+/).filter(w => /[a-z0-9]/i.test(w));
  if (words.length === 0) return 'IA';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map(w => w[0].toUpperCase()).join('');
};
