// Estadísticas de día, semana y mes. Todo se calcula a partir de lo apuntado.
//
// Cumplimiento de un día: para cada objetivo diario (beta-glucanos, frutos secos,
// esteroles, fruta/verdura) vale 1 si se cumple, 0,5 si se llega al 50 % y 0 si no.
// El % del día es la media de los cuatro. El % de una semana o un mes es la media
// de los días con algo apuntado.

import { MEALS } from './defaults.js';
import { dayTotals, dayQuality, DAILY_INDICATORS, nf } from './calc.js';
import { todayKey, weekDays } from './util.js';

const EPS = 1e-9;

export function hasData(day) {
  if (!day) return false;
  return MEALS.some((m) => (day.meals[m.id] || []).length > 0)
    || Number(day.aerobicMin) > 0 || !!day.strength || !!(day.notes || '').trim();
}

export function daySummary(day, foodsById, goals) {
  const totals = dayTotals(day, foodsById);
  const ind = DAILY_INDICATORS.map((i) => {
    const goal = Number(goals[i.key]) || 0;
    const value = totals[i.total];
    const ratio = goal > 0 ? value / goal : 1;
    const level = ratio >= 1 - EPS ? 2 : ratio >= 0.5 - EPS ? 1 : 0; // 2 lleno, 1 medio, 0 vacío
    return { key: i.key, label: i.label, value, goal, level };
  });
  const pct = Math.round((ind.reduce((s, i) => s + i.level / 2, 0) / ind.length) * 100);
  return {
    totals, ind, pct,
    quality: dayQuality(day, foodsById),
    aerobicMin: Number(day.aerobicMin) || 0,
    strength: !!day.strength,
    legumeDay: totals.legume >= 0.5 - EPS,
  };
}

const average = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);

/** Resumen de un conjunto de días (semana o mes). */
export function periodSummary(keys, data, foodsById) {
  const goals = data.settings.goals;
  const list = keys.filter((k) => hasData(data.days[k])).map((k) => ({ key: k, s: daySummary(data.days[k], foodsById, goals) }));
  const sum = (f) => list.reduce((a, d) => a + f(d.s), 0);
  return {
    daysWithData: list.length,
    pct: average(list.map((d) => d.s.pct)),
    legumeDays: sum((s) => (s.legumeDay ? 1 : 0)),
    oilyFish: sum((s) => s.totals.oilyFish),
    redMeat: sum((s) => s.totals.redMeat),
    cheese: sum((s) => s.totals.cheese),
    aerobicMin: sum((s) => s.aerobicMin),
    strengthDays: sum((s) => (s.strength ? 1 : 0)),
    qualityScore: sum((s) => s.quality.score),
    days: list,
  };
}

/** Semana completa (lunes a domingo) con contadores, estados y rejilla diaria. */
export function weekStats(start, data, foodsById, today = todayKey()) {
  const goals = data.settings.goals;
  const keys = weekDays(start);
  const p = periodSummary(keys, data, foodsById);
  const byKey = Object.fromEntries(p.days.map((d) => [d.key, d.s]));

  const daysLeft = keys.filter((k) => k > today).length;          // días después de hoy
  const todayInWeek = keys.includes(today);
  const todayS = byKey[today];
  // Huecos que aún pueden contar para objetivos "por día": los días que quedan, y hoy si aún no cuenta.
  const slots = (countsToday) => daysLeft + (todayInWeek && !countsToday ? 1 : 0);
  const closed = keys[6] < today;
  const leftTxt = closed ? '' : daysLeft === 0 ? ' · último día' : ` · ${daysLeft === 1 ? 'queda 1 día' : `quedan ${daysLeft} días`}`;

  const minCounter = (label, value, goal, unit, unitOne, perDayCountsToday, closeFactor = 1) => {
    const fmt = (n) => nf(n, 0);
    const u = goal === 1 ? unitOne : unit;
    if (value >= goal - EPS) return { label, status: 'ok', text: `${label}: ${fmt(value)} de ${fmt(goal)} ${u} ✓` };
    const reachable = perDayCountsToday === null ? !closed : value + slots(perDayCountsToday) >= goal - EPS;
    if (!reachable) return { label, status: 'imposible', text: `${label}: ${fmt(value)} de ${fmt(goal)} ${u} · ${closed ? 'no se llegó' : 'ya no se llega esta semana'}` };
    const near = goal - value <= closeFactor + EPS;
    return { label, status: near ? 'casi' : 'falta', text: `${label}: ${fmt(value)} de ${fmt(goal)} ${u}${leftTxt}` };
  };
  const maxCounter = (label, value, max) => {
    if (value > max + EPS) return { label, status: 'over', text: `${label}: ${nf(value, 0)} · superado el máximo de ${nf(max, 0)}` };
    if (value >= max - EPS && max > 0) return { label, status: 'casi', text: `${label}: ${nf(value, 0)} de máx. ${nf(max, 0)} · al límite` };
    return { label, status: 'ok', text: `${label}: ${nf(value, 0)} de máx. ${nf(max, 0)}` };
  };

  const counters = [
    minCounter('Legumbre', p.legumeDays, Number(goals.legumeDaysMin), 'días', 'día', !!(todayS && todayS.legumeDay)),
    minCounter('Pescado azul', p.oilyFish, Number(goals.oilyFishMin), 'veces', 'vez', false),
    maxCounter('Carne roja', p.redMeat, Number(goals.redMeatMax)),
    maxCounter('Queso', p.cheese, Number(goals.cheeseMax)),
    minCounter('Ejercicio aeróbico', p.aerobicMin, Number(goals.aerobicMin), 'min', 'min', null, Number(goals.aerobicMin) / 3),
    minCounter('Fuerza', p.strengthDays, Number(goals.strengthMin), 'sesiones', 'sesión', !!(todayS && todayS.strength)),
  ];

  const grid = DAILY_INDICATORS.map((i, idx) => ({
    label: i.label,
    cells: keys.map((k) => ({ key: k, future: k > today, level: byKey[k] ? byKey[k].ind[idx].level : (k > today ? null : 0) })),
  }));
  const quality = keys.map((k) => ({ key: k, future: k > today, q: byKey[k] ? byKey[k].quality : null }));

  return { start, keys, counters, grid, quality, pct: p.pct, daysWithData: p.daysWithData, period: p };
}
