// Estadísticas de día, semana y mes a partir de las casillas marcadas.
//
// Cumplimiento de un periodo: para cada casilla activa, días marcados ÷ días objetivo
// (máximo 100 %), escalando el objetivo semanal a la duración del periodo.
// El % del periodo es la media de todas las casillas.

import { COUNTERS, activeChecks } from './defaults.js';
import { todayKey, weekDays, addDays, weekStart } from './util.js';

export function hasData(day) {
  if (!day) return false;
  return Object.values(day.checks || {}).some(Boolean)
    || Object.values(day.counts || {}).some((n) => n > 0)
    || (day.exercise || []).length > 0 || !!(day.notes || '').trim();
}

export const isStrength = (e) => e.type === 'Fuerza';
export function dayExercise(day) {
  const ex = (day && day.exercise) || [];
  return {
    aerobicMin: ex.filter((e) => !isStrength(e)).reduce((a, e) => a + (Number(e.min) || 0), 0),
    strength: ex.some(isStrength),
    totalMin: ex.reduce((a, e) => a + (Number(e.min) || 0), 0),
  };
}

/** Resumen de un conjunto de días. nDays = duración del periodo (para escalar objetivos). */
export function periodSummary(keys, data, nDays = Math.max(1, keys.filter((k) => k <= todayKey()).length)) {
  const checks = activeChecks(data.settings);
  const days = keys.map((k) => data.days[k]).filter(hasData);
  const per = checks.map((c) => {
    const count = days.filter((d) => d.checks && d.checks[c.id]).length;
    const target = Math.max(1, Math.round((c.target * nDays) / 7));
    return { ...c, count, periodTarget: target, ratio: Math.min(1, count / target) };
  });
  let aerobicMin = 0, strengthDays = 0;
  for (const d of days) { const e = dayExercise(d); aerobicMin += e.aerobicMin; if (e.strength) strengthDays++; }
  return {
    daysWithData: days.length,
    pct: days.length ? Math.round((per.reduce((a, c) => a + c.ratio, 0) / (per.length || 1)) * 100) : null,
    checks: per,
    counts: COUNTERS.map((c) => ({ ...c, total: days.reduce((a, d) => a + ((d.counts || {})[c.id] || 0), 0) })),
    aerobicMin,
    strengthDays,
  };
}

/** Semana completa (lunes a domingo) con contadores, estados y rejilla. */
export function weekStats(start, data, today = todayKey()) {
  const goals = data.settings.goals;
  const keys = weekDays(start);
  const p = periodSummary(keys, data);
  const daysLeft = keys.filter((k) => k > today).length;
  const closed = keys[6] < today;
  const todayInWeek = keys.includes(today);
  const leftTxt = closed ? '' : daysLeft === 0 ? ' · último día' : ` · ${daysLeft === 1 ? 'queda 1 día' : `quedan ${daysLeft} días`}`;

  const counter = (label, value, goal, unit, unitOne, ...rest) => ({ ...counter0(label, value, goal, unit, unitOne, ...rest), value, goal, unit: goal === 1 ? unitOne : unit });
  const counter0 = (label, value, goal, unit, unitOne, slots, fmt = (n) => String(n), nearBy = 1) => {
    const u = goal === 1 ? unitOne : unit;
    if (value >= goal) return { label, status: 'ok', text: `${label}: ${fmt(value)} de ${fmt(goal)} ${u} ✓` };
    if (slots !== null && value + slots < goal) {
      return { label, status: 'imposible', text: `${label}: ${fmt(value)} de ${fmt(goal)} ${u} · ${closed ? 'no se llegó' : 'ya no se llega esta semana'}` };
    }
    if (closed) return { label, status: 'imposible', text: `${label}: ${fmt(value)} de ${fmt(goal)} ${u} · no se llegó` };
    return { label, status: goal - value <= nearBy ? 'casi' : 'falta', text: `${label}: ${fmt(value)} de ${fmt(goal)} ${u}${leftTxt}` };
  };
  const todayDay = data.days[today];
  const slotsFor = (markedToday) => daysLeft + (todayInWeek && !markedToday ? 1 : 0);

  // Las dos casillas de avena se muestran juntas en los contadores.
  const counters = [];
  const seen = new Set();
  for (const c of p.checks) {
    if (c.group && seen.has(c.group)) continue;
    if (c.group) {
      seen.add(c.group);
      const g = p.checks.filter((x) => x.group === c.group);
      const value = g.reduce((a, x) => a + x.count, 0);
      const goal = g.reduce((a, x) => a + x.target, 0);
      const marked = g.filter((x) => todayDay && todayDay.checks && todayDay.checks[x.id]).length;
      const slots = daysLeft * g.length + (todayInWeek ? g.length - marked : 0);
      counters.push(counter(g.length > 1 ? 'Avena' : c.label, value, goal, 'tomas', 'toma', slots));
    } else {
      const marked = !!(todayDay && todayDay.checks && todayDay.checks[c.id]);
      counters.push(counter(c.label, c.count, c.target, 'días', 'día', slotsFor(marked)));
    }
  }
  counters.push(counter('Ejercicio aeróbico', p.aerobicMin, Number(goals.aerobicMin) || 0, 'min', 'min', null, String, (Number(goals.aerobicMin) || 0) / 3));
  const strengthToday = !!(todayDay && dayExercise(todayDay).strength);
  counters.push(counter('Fuerza', p.strengthDays, Number(goals.strengthMin) || 0, 'sesiones', 'sesión', slotsFor(strengthToday)));

  const grid = p.checks.map((c) => ({
    label: c.label,
    cells: keys.map((k) => ({ key: k, future: k > today, done: !!(data.days[k] && data.days[k].checks && data.days[k].checks[c.id]) })),
  }));
  const exRow = keys.map((k) => ({ key: k, future: k > today, ...dayExercise(data.days[k]) }));

  const countRows = COUNTERS.map((c) => ({
    label: c.short,
    cells: keys.map((k) => ({ key: k, future: k > today, n: ((data.days[k] || {}).counts || {})[c.id] || 0 })),
  }));

  return { start, keys, counters, grid, countRows, exRow, pct: p.pct, daysWithData: p.daysWithData, period: p };
}

/** Días seguidos con la casilla marcada, terminando hoy (o ayer si hoy aún no está marcada). */
export function checkStreak(data, id, today = todayKey()) {
  const on = (k) => !!(data.days[k] && data.days[k].checks && data.days[k].checks[id]);
  let k = on(today) ? today : addDays(today, -1);
  let n = 0;
  while (on(k)) { n++; k = addDays(k, -1); }
  return n;
}

/** Semanas cerradas seguidas (sin contar la actual) con al menos un 80 % de cumplimiento. */
export function goodWeeksStreak(data, today = todayKey()) {
  let w = addDays(weekStart(today), -7);
  let n = 0;
  for (;;) {
    const p = periodSummary(weekDays(w), data, 7);
    if (p.pct == null || p.pct < 80) break;
    n++; w = addDays(w, -7);
  }
  return n;
}
