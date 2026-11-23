// Utilidades compartidas: fechas (siempre en hora local) y texto.

export function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function todayKey() { return dateKey(new Date()); }
export function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
export function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); }
export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function dayLabel(k) {
  const t = todayKey();
  if (k === t) return 'Hoy';
  if (k === addDays(t, -1)) return 'Ayer';
  return capitalize(parseKey(k).toLocaleDateString('es-ES', { weekday: 'long' }));
}
export function longDate(k) { return parseKey(k).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }); }
export function shortDate(k) { return parseKey(k).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', ''); }
export function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return capitalize(new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));
}

/** Lunes de la semana de la fecha dada. */
export function weekStart(k) {
  const d = parseKey(k);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dateKey(d);
}
export const weekDays = (start) => Array.from({ length: 7 }, (_, i) => addDays(start, i));
export function weekRangeLabel(start) {
  const end = addDays(start, 6);
  const a = parseKey(start), b = parseKey(end);
  const month = (d) => d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${month(b)}`
    : `${a.getDate()} ${month(a)} – ${b.getDate()} ${month(b)}`;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
