// Pantallas "Semana" e "Historial" y el resumen semanal de "Hoy".

import { weekStats, periodSummary, hasData, dayExercise, goodWeeksStreak } from './stats.js';
import { COUNTERS, activeChecks, checkValue } from './defaults.js';
import { esc, num, todayKey, weekStart, weekDays, weekRangeLabel, addDays, parseKey, longDate, shortDate, monthLabel, dayLabel } from './util.js';

const STATUS = {
  ok: { icon: '✓', cls: 's1', label: 'Bien' },
  casi: { icon: '≈', cls: 'sm1', label: 'Casi' },
  falta: { icon: '○', cls: 's0', label: 'Falta' },
  imposible: { icon: '✕', cls: 'sm2', label: 'No se llega' },
};
const WEEKDAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function counterRow(c) {
  const st = STATUS[c.status];
  return `<li class="counter"><span class="dot ${st.cls}" title="${st.label}">${st.icon}</span><span>${esc(c.text)}</span></li>`;
}

function barRow(c) {
  const pct = c.goal > 0 ? Math.min(100, (c.value / c.goal) * 100) : 0;
  const cls = c.status === 'ok' ? '' : c.status === 'imposible' ? 'bad' : 'part';
  return `<div class="wbar">
      <div class="ind-top"><b>${esc(c.label)}</b><span class="val">${num(c.value)} / ${num(c.goal)} ${esc(c.unit)}${c.status === 'ok' ? ' ✓' : ''}</span></div>
      <div class="bar ${cls}" role="progressbar" aria-valuenow="${c.value}" aria-valuemax="${c.goal}" aria-label="${esc(c.label)}"><span style="width:${pct.toFixed(1)}%"></span></div>
    </div>`;
}

export function renderWeekSummary(state) {
  const ws = weekStats(weekStart(state.date), state.data);
  const today = todayKey();
  const left = ws.keys.filter((k) => k > today).length;
  const sub = ws.keys[6] < today ? 'semana cerrada' : left === 0 ? 'último día' : left === 1 ? 'queda 1 día' : `quedan ${left} días`;
  return `
    <section class="card">
      <h2>Esta semana <span class="sub">${sub}</span></h2>
      ${ws.counters.map(barRow).join('')}
      <p style="margin:8px 0 0"><button class="linkbtn" data-action="open-week">Ver semana ›</button></p>
      ${goodWeeksLine(state)}
    </section>`;
}

function goodWeeksLine(state) {
  const n = goodWeeksStreak(state.data);
  return n ? `<p class="streakline">🔥 ${n} ${n === 1 ? 'semana buena' : 'semanas buenas seguidas'} (80 % o más)</p>` : '';
}

export function renderWeek(state) {
  const start = state.weekStart || weekStart(todayKey());
  const ws = weekStats(start, state.data);
  const isCurrent = start === weekStart(todayKey());
  const today = todayKey();

  const head = `<div class="grid-row head"><span></span>${ws.keys.map((k, i) =>
    `<button class="gday ${k === today ? 'today' : ''}" data-action="open-day" data-date="${k}">${WEEKDAY_LETTERS[i]}<small>${parseKey(k).getDate()}</small></button>`).join('')}</div>`;
  const rows = ws.grid.map((r) => `<div class="grid-row"><span class="glabel">${esc(r.label)}</span>${r.cells.map((c) => {
    const t = `${r.label}, ${shortDate(c.key)}: ${c.half ? 'media ración' : c.done ? 'sí' : 'no'}`;
    return c.future && !c.done ? '<span class="pt future"></span>'
      : `<span class="pt ${c.half ? 'half' : c.done ? 'full' : 'empty'}" title="${esc(t)}" aria-label="${esc(t)}"></span>`;
  }).join('')}</div>`).join('');
  const countRows = ws.countRows.map((r) => `<div class="grid-row"><span class="glabel">${esc(r.label)}</span>${r.cells.map((c) => {
    const t = `${r.label}, ${shortDate(c.key)}: ${c.n}`;
    return c.n ? `<span class="pt q s1" title="${esc(t)}" aria-label="${esc(t)}">${c.n}</span>`
      : `<span class="pt ${c.future ? 'future' : 'empty'}"></span>`;
  }).join('')}</div>`).join('');
  const exrow = `<div class="grid-row"><span class="glabel">Ejercicio</span>${ws.exRow.map((c) =>
    c.totalMin || c.strength ? `<span class="pt q s1" title="${esc(shortDate(c.key))}">${c.totalMin ? c.totalMin : 'F'}</span>`
      : `<span class="pt ${c.future ? 'future' : 'empty'}"></span>`).join('')}</div>`;

  return `
    <header class="dayhead">
      <button class="iconbtn" data-action="prev-week" aria-label="Semana anterior">‹</button>
      <h1>${isCurrent ? 'Esta semana' : 'Semana'}<small>${esc(weekRangeLabel(start))}</small></h1>
      <button class="iconbtn" data-action="next-week" aria-label="Semana siguiente" ${isCurrent ? 'disabled' : ''}>›</button>
    </header>
    ${isCurrent ? '' : '<p style="text-align:center;margin:-6px 0 10px"><button class="linkbtn" data-action="this-week">Volver a esta semana</button></p>'}

    <section class="card">
      <h2>Objetivos semanales <span class="sub">${ws.pct == null ? 'sin datos' : `${ws.pct} %`}</span></h2>
      <ul class="counters">${ws.counters.map(counterRow).join('')}</ul>
      ${isCurrent ? goodWeeksLine(state) : ''}
    </section>

    <section class="card">
      <h2>Día a día</h2>
      <div class="wgrid">${head}${rows}${countRows}${exrow}</div>
      <p class="legend"><span class="pt full"></span> hecho <span class="pt half"></span> media ración <span class="pt empty"></span> no hecho · en galletas, unidades · en ejercicio, minutos (F = fuerza)</p>
      <p class="hint">Toca un día para abrirlo.</p>
    </section>`;
}

// ---------- Historial ----------

function dayChips(state, day) {
  const out = activeChecks(state.data.settings).filter((c) => checkValue(day, c))
    .map((c) => `<span class="chip">${esc(c.label)}${c.portions ? (checkValue(day, c) < 1 ? ' ½' : ' 1 ración') : ''}</span>`);
  for (const c of COUNTERS) {
    const n = (day.counts || {})[c.id] || 0;
    if (n) out.push(`<span class="chip">${esc(c.short)} × ${n}</span>`);
  }
  for (const x of day.exercise || []) out.push(`<span class="chip">${esc(x.type)}${x.min ? ` ${x.min} min` : ''}</span>`);
  return out.join('');
}

function renderDays(state) {
  const n = activeChecks(state.data.settings).length;
  const keys = Object.keys(state.data.days).filter((k) => hasData(state.data.days[k])).sort().reverse();
  if (!keys.length) return '<p class="placeholder">Todavía no hay días apuntados.</p>';
  return keys.map((k) => {
    const day = state.data.days[k];
    const done = activeChecks(state.data.settings).filter((c) => day.checks && day.checks[c.id]).length;
    const label = dayLabel(k) === 'Hoy' || dayLabel(k) === 'Ayer' ? `${dayLabel(k)}, ${shortDate(k)}` : longDate(k);
    return `<button class="card hday" data-action="open-day" data-date="${k}">
      <div class="ind-top"><b>${esc(label)}</b><span class="val">${done} de ${n}</span></div>
      <div class="chips">${dayChips(state, day)}</div>
      ${(day.notes || '').trim() ? `<p class="hnote">${esc(day.notes.trim())}</p>` : ''}
    </button>`;
  }).join('');
}

function summaryLine(p) {
  const parts = p.checks.map((c) => `${c.label.toLowerCase()} ${num(c.count)}`);
  for (const c of p.counts) if (c.total) parts.push(`${c.short.toLowerCase()} ${c.total}`);
  parts.push(`${p.aerobicMin} min ejercicio`, `fuerza ${p.strengthDays}`);
  return `${p.daysWithData} ${p.daysWithData === 1 ? 'día' : 'días'} · ${parts.join(' · ')}`;
}

function weekStartsWithData(state) {
  return [...new Set(Object.keys(state.data.days).filter((k) => hasData(state.data.days[k])).map(weekStart))].sort().reverse();
}

function renderWeeks(state) {
  const starts = weekStartsWithData(state);
  if (!starts.length) return '<p class="placeholder">Todavía no hay semanas con datos.</p>';
  const current = weekStart(todayKey());
  const firstData = starts[starts.length - 1];
  const shown = Array.from({ length: 12 }, (_, i) => addDays(current, -7 * (11 - i))).filter((w) => w >= firstData);
  const bars = shown.map((w) => {
    const v = periodSummary(weekDays(w), state.data).pct;
    const label = `${weekRangeLabel(w)}: ${v == null ? 'sin datos' : v + ' %'}`;
    return `<button class="cbar" data-action="open-week-start" data-start="${w}" title="${esc(label)}" aria-label="${esc(label)}">
      <span class="cval">${v == null ? '–' : v}</span>
      <span class="ctrack"><span class="cfill" style="height:${v || 0}%"></span></span>
      <span class="clab">${parseKey(w).getDate()}/${parseKey(w).getMonth() + 1}</span></button>`;
  }).join('');
  const list = starts.map((w) => {
    const p = periodSummary(weekDays(w), state.data);
    return `<button class="card hday" data-action="open-week-start" data-start="${w}">
      <div class="ind-top"><b>Semana ${esc(weekRangeLabel(w))}</b><span class="val">${p.pct} %</span></div>
      <div class="bar ${p.pct >= 100 ? '' : 'part'}"><span style="width:${p.pct}%"></span></div>
      <p class="hint">${esc(summaryLine(p))}</p></button>`;
  }).join('');
  return `<section class="card">
      <h2>Cumplimiento semanal</h2>
      <div class="chart" role="img" aria-label="Cumplimiento por semana">${bars}</div>
      <p class="hint">Cada barra es una semana (la fecha es su lunes). Toca una barra para abrirla.</p>
    </section>${list}`;
}

function renderMonths(state) {
  const months = [...new Set(Object.keys(state.data.days).filter((k) => hasData(state.data.days[k])).map((k) => k.slice(0, 7)))].sort().reverse();
  if (!months.length) return '<p class="placeholder">Todavía no hay meses con datos.</p>';
  return months.map((ym) => {
    const [y, m] = ym.split('-').map(Number);
    const nDays = new Date(y, m, 0).getDate();
    const keys = Array.from({ length: nDays }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`);
    const p = periodSummary(keys, state.data);
    return `<section class="card">
      <div class="ind-top"><b>${esc(monthLabel(ym))}</b><span class="val">${p.pct} %</span></div>
      <div class="bar ${p.pct >= 100 ? '' : 'part'}"><span style="width:${p.pct}%"></span></div>
      <p class="hint">${esc(summaryLine(p))}</p></section>`;
  }).join('');
}

export function renderHistory(state) {
  const mode = state.historyMode || 'dias';
  const tab = (id, label) => `<button class="seg ${mode === id ? 'active' : ''}" data-action="history-mode" data-mode="${id}">${label}</button>`;
  const body = mode === 'semanas' ? renderWeeks(state) : mode === 'meses' ? renderMonths(state) : renderDays(state);
  return `
    <header class="dayhead"><h1>Historial</h1></header>
    <div class="segmented">${tab('dias', 'Días')}${tab('semanas', 'Semanas')}${tab('meses', 'Meses')}</div>
    ${body}
    <p class="note">% de cumplimiento: para cada casilla, días marcados respecto al objetivo (por ejemplo, frutos secos 5 días por semana), con un máximo del 100 %, y la media de todas. La legumbre se cuenta en raciones: media ración suma 0,5.</p>`;
}
