// Pantallas "Semana" e "Historial" y el resumen semanal de "Hoy".
// Cada función recibe el estado y devuelve HTML.

import { weekStats, periodSummary, daySummary, hasData } from './stats.js';
import { nf } from './calc.js';
import { esc, todayKey, weekStart, weekDays, weekRangeLabel, addDays, parseKey, longDate, shortDate, monthLabel, dayLabel } from './util.js';

const STATUS = {
  ok: { icon: '✓', cls: 's1', label: 'Bien' },
  casi: { icon: '≈', cls: 'sm1', label: 'Casi' },
  falta: { icon: '○', cls: 's0', label: 'Falta' },
  imposible: { icon: '✕', cls: 'sm2', label: 'No se llega' },
  over: { icon: '!', cls: 'sm2', label: 'Superado' },
};
const WEEKDAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function counterRow(c) {
  const st = STATUS[c.status];
  return `<li class="counter"><span class="dot ${st.cls}" title="${st.label}">${st.icon}</span><span>${esc(c.text)}</span></li>`;
}

/** Resumen compacto para la pantalla "Hoy". */
export function renderWeekSummary(state) {
  const ws = weekStats(weekStart(state.date), state.data, state.foodsById);
  return `
    <section class="card">
      <h2>Esta semana <button class="linkbtn small" data-action="open-week">Ver semana ›</button></h2>
      <ul class="counters compact">${ws.counters.map(counterRow).join('')}</ul>
    </section>`;
}

function dotCell(level, future, title) {
  if (future || level == null) return `<span class="pt future" title="${esc(title)}"></span>`;
  const cls = level === 2 ? 'full' : level === 1 ? 'half' : 'empty';
  const txt = level === 2 ? 'cumplido' : level === 1 ? 'al menos el 50 %' : 'no cumplido';
  return `<span class="pt ${cls}" title="${esc(title + ': ' + txt)}" aria-label="${esc(title + ': ' + txt)}"></span>`;
}

export function renderWeek(state) {
  const start = state.weekStart || weekStart(todayKey());
  const ws = weekStats(start, state.data, state.foodsById);
  const isCurrent = start === weekStart(todayKey());
  const today = todayKey();

  const head = `<div class="grid-row head"><span></span>${ws.keys.map((k, i) =>
    `<button class="gday ${k === today ? 'today' : ''}" data-action="open-day" data-date="${k}">${WEEKDAY_LETTERS[i]}<small>${parseKey(k).getDate()}</small></button>`).join('')}</div>`;
  const rows = ws.grid.map((r) => `<div class="grid-row"><span class="glabel">${esc(r.label)}</span>${r.cells.map((c) =>
    dotCell(c.level, c.future, `${r.label}, ${shortDate(c.key)}`)).join('')}</div>`).join('');
  const qrow = `<div class="grid-row"><span class="glabel">Calidad</span>${ws.quality.map((c) =>
    c.q && c.q.count ? `<span class="pt q ${c.q.cls}" title="${esc(shortDate(c.key) + ': ' + c.q.label)}">${c.q.score > 0 ? '+' : ''}${c.q.score}</span>`
      : `<span class="pt future"></span>`).join('')}</div>`;

  return `
    <header class="dayhead">
      <button class="iconbtn" data-action="prev-week" aria-label="Semana anterior">‹</button>
      <h1>${isCurrent ? 'Esta semana' : 'Semana'}<small>${esc(weekRangeLabel(start))}</small></h1>
      <button class="iconbtn" data-action="next-week" aria-label="Semana siguiente" ${isCurrent ? 'disabled' : ''}>›</button>
    </header>
    ${isCurrent ? '' : '<p style="text-align:center;margin:-6px 0 10px"><button class="linkbtn" data-action="this-week">Volver a esta semana</button></p>'}

    <section class="card">
      <h2>Objetivos semanales</h2>
      <ul class="counters">${ws.counters.map(counterRow).join('')}</ul>
    </section>

    <section class="card">
      <h2>Objetivos diarios <span class="sub">${ws.pct == null ? 'sin datos' : `${ws.pct} % de cumplimiento`}</span></h2>
      <div class="wgrid">${head}${rows}${qrow}</div>
      <p class="legend"><span class="pt full"></span> cumplido <span class="pt half"></span> 50 % o más <span class="pt empty"></span> menos del 50 %</p>
      <p class="hint">El porcentaje es la media de los días con algo apuntado (${ws.daysWithData} ${ws.daysWithData === 1 ? 'día' : 'días'}). Toca un día para abrirlo.</p>
    </section>`;
}

// ---------- Historial ----------

function chips(s) {
  const out = [];
  if (s.totals.legume > 0) out.push(`<span class="chip">Legumbre${s.legumeDay ? '' : ' (½)'}</span>`);
  if (s.totals.oilyFish > 0) out.push('<span class="chip">Pescado azul</span>');
  if (s.totals.redMeat > 0) out.push('<span class="chip warn">Carne roja</span>');
  if (s.totals.cheese > 0) out.push('<span class="chip warn">Queso</span>');
  if (s.aerobicMin > 0) out.push(`<span class="chip">${nf(s.aerobicMin, 0)} min ejercicio</span>`);
  if (s.strength) out.push('<span class="chip">Fuerza</span>');
  return out.join('');
}

function renderDays(state) {
  const goals = state.data.settings.goals;
  const keys = Object.keys(state.data.days).filter((k) => hasData(state.data.days[k])).sort().reverse();
  if (!keys.length) return '<p class="placeholder">Todavía no hay días apuntados.</p>';
  return keys.map((k) => {
    const day = state.data.days[k];
    const s = daySummary(day, state.foodsById, goals);
    return `<button class="card hday" data-action="open-day" data-date="${k}">
      <div class="ind-top"><b>${esc(dayLabel(k) === 'Hoy' || dayLabel(k) === 'Ayer' ? dayLabel(k) + ', ' + shortDate(k) : longDate(k))}</b>
        <span class="val">${s.pct} %</span></div>
      <div class="bar ${s.pct >= 100 ? '' : 'part'}"><span style="width:${s.pct}%"></span></div>
      <div class="chips">${s.quality.count ? `<span class="badge ${s.quality.cls}">${s.quality.label}</span>` : ''}${chips(s)}</div>
      ${(day.notes || '').trim() ? `<p class="hnote">${esc(day.notes.trim())}</p>` : ''}
    </button>`;
  }).join('');
}

function summaryLine(p) {
  return `${p.daysWithData} ${p.daysWithData === 1 ? 'día' : 'días'} · legumbre ${p.legumeDays} d · pescado azul ${nf(p.oilyFish, 0)} · carne roja ${nf(p.redMeat, 0)} · queso ${nf(p.cheese, 0)} · ${nf(p.aerobicMin, 0)} min ejercicio · fuerza ${p.strengthDays}`;
}

function weekStartsWithData(state) {
  const set = new Set(Object.keys(state.data.days).filter((k) => hasData(state.data.days[k])).map(weekStart));
  return [...set].sort().reverse();
}

function renderWeeks(state) {
  const starts = weekStartsWithData(state);
  if (!starts.length) return '<p class="placeholder">Todavía no hay semanas con datos.</p>';
  // Gráfico: últimas 12 semanas consecutivas hasta la actual.
  const current = weekStart(todayKey());
  const chartWeeks = Array.from({ length: 12 }, (_, i) => addDays(current, -7 * (11 - i)));
  const firstData = starts[starts.length - 1];
  const shown = chartWeeks.filter((w) => w >= firstData);
  const bars = shown.map((w) => {
    const p = periodSummary(weekDays(w), state.data, state.foodsById);
    const v = p.pct;
    const label = `${weekRangeLabel(w)}: ${v == null ? 'sin datos' : v + ' %'}`;
    return `<button class="cbar" data-action="open-week-start" data-start="${w}" title="${esc(label)}" aria-label="${esc(label)}">
      <span class="cval">${v == null ? '–' : v}</span>
      <span class="ctrack"><span class="cfill" style="height:${v || 0}%"></span></span>
      <span class="clab">${parseKey(w).getDate()}/${parseKey(w).getMonth() + 1}</span></button>`;
  }).join('');

  const list = starts.map((w) => {
    const p = periodSummary(weekDays(w), state.data, state.foodsById);
    return `<button class="card hday" data-action="open-week-start" data-start="${w}">
      <div class="ind-top"><b>Semana ${esc(weekRangeLabel(w))}</b><span class="val">${p.pct} %</span></div>
      <div class="bar ${p.pct >= 100 ? '' : 'part'}"><span style="width:${p.pct}%"></span></div>
      <p class="hint">${esc(summaryLine(p))}</p></button>`;
  }).join('');

  return `<section class="card">
      <h2>Cumplimiento semanal <span class="sub">% de objetivos diarios</span></h2>
      <div class="chart" role="img" aria-label="Cumplimiento por semana">${bars}</div>
      <p class="hint">Cada barra es una semana (la fecha es su lunes). Toca una barra para abrirla.</p>
    </section>${list}`;
}

function renderMonths(state) {
  const months = [...new Set(Object.keys(state.data.days).filter((k) => hasData(state.data.days[k])).map((k) => k.slice(0, 7)))].sort().reverse();
  if (!months.length) return '<p class="placeholder">Todavía no hay meses con datos.</p>';
  return months.map((ym) => {
    const keys = Object.keys(state.data.days).filter((k) => k.startsWith(ym));
    const p = periodSummary(keys, state.data, state.foodsById);
    return `<section class="card">
      <div class="ind-top"><b>${esc(monthLabel(ym))}</b><span class="val">${p.pct} %</span></div>
      <div class="bar ${p.pct >= 100 ? '' : 'part'}"><span style="width:${p.pct}%"></span></div>
      <p class="hint">${esc(summaryLine(p))} · calidad de comidas ${p.qualityScore > 0 ? '+' : ''}${p.qualityScore}</p></section>`;
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
    <p class="note">% de cumplimiento: media de los cuatro objetivos diarios (1 si se cumple, ½ si se llega al 50 %) en los días con algo apuntado.</p>`;
}
