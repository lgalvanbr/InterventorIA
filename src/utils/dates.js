// Fechas locales (Colombia, UTC-5). new Date().toISOString() devuelve la fecha en UTC:
// después de las 7 p. m. daría el día siguiente.
export function toLocalIso(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const todayLocalIso = () => toLocalIso(new Date());
