import * as storage from './storage.js';
import { CHECKS, COUNTERS, FOODS, MAX_COUNT, EXERCISE_TYPES, foodTotals, activeChecks, emptyDay } from './defaults.js';
import { todayKey, addDays, dayLabel, longDate, esc, num, uid, weekStart } from './util.js';
import { renderWeek, renderWeekSummary, renderHistory } from './views.js';
import { checkStreak, hasData } from './stats.js';

export const APP_VERSION = '0.6.0';

const view = document.getElementById('view');
const sheet = document.getElementById('sheet');

const state = {
  data: null,        // { settings, days }
  date: todayKey(),
  tab: 'hoy',
  persisted: false,
};

function currentDay() {
  return state.data.days[state.date] || emptyDay();
}
// Los cambios se aplican de uno en uno: así dos toques muy seguidos no se pisan.
let saveQueue = Promise.resolve();
function updateDay(mutator, date = state.date) {
  const run = saveQueue.then(async () => {
    const day = structuredClone(state.data.days[date] || emptyDay());
    mutator(day);
    state.data.days[date] = await storage.saveDay(date, day);
  });
  saveQueue = run.catch(() => {});
  return run;
}

// ---------- Render principal ----------
function render() {
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === state.tab));
  if (state.tab === 'hoy') view.innerHTML = renderToday();
  else if (state.tab === 'ajustes') view.innerHTML = renderSettings();
  else if (state.tab === 'semana') view.innerHTML = renderWeek(state);
  else if (state.tab === 'historial') view.innerHTML = renderHistory(state);
}

function renderToday() {
  const day = currentDay();
  const isToday = state.date === todayKey();
  const checks = activeChecks(state.data.settings);
  const done = checks.filter((c) => day.checks[c.id]).length;

  const boxes = checks.map((c) => { const st = isToday ? checkStreak(state.data, c.id) : 0; return `
    <button class="tick ${day.checks[c.id] ? 'on' : ''}" data-action="toggle" data-id="${c.id}" aria-pressed="${!!day.checks[c.id]}">
      <span class="box">${day.checks[c.id] ? '✓' : ''}</span>
      <span class="grow"><b>${esc(c.label)}</b><small>${esc(c.hint)}</small></span>
      ${st >= 2 ? `<span class="streak" title="Días seguidos">🔥 ${st}</span>` : ''}
    </button>`; }).join('');
  const counters = COUNTERS.map((c) => {
    const f = FOODS[c.food];
    const n = (day.counts || {})[c.id] || 0;
    const t = foodTotals(f, n || 1);
    const approx = f.gramsEstimated ? '≈ ' : '';
    const sub = `${n ? `${n} ${n === 1 ? f.unit : f.unit + 's'}` : `Por ${f.unit}`}: ${approx}${num(t.beta)} g beta-glucanos · ${num(t.kcal, 0)} kcal · ${num(t.sat, 1)} g sat.`;
    return `
    <div class="tick count ${n ? 'on' : ''}">
      <button class="tickmain" data-action="count-toggle" data-id="${c.id}" aria-pressed="${!!n}">
        <span class="box">${n ? '✓' : ''}</span>
        <span class="grow"><b>${esc(f.name)}</b><small>${esc(f.note)}</small></span>
      </button>
      <div class="stepper">
        <button class="iconbtn" data-action="count" data-id="${c.id}" data-d="-1" aria-label="Quitar una ${esc(f.name)}" ${n ? '' : 'disabled'}>−</button>
        <output class="cnum" aria-label="Nº de galletas">${n}</output>
        <button class="iconbtn" data-action="count" data-id="${c.id}" data-d="1" aria-label="Añadir una ${esc(f.name)}" ${n >= MAX_COUNT ? 'disabled' : ''}>+</button>
      </div>
      <small class="csub">${sub}</small>
    </div>`;
  }).join('');
  const usual = (state.data.settings.usual || []).filter((id) => checks.some((c) => c.id === id));
  const usualPending = usual.some((id) => !day.checks[id]);

  const ex = (day.exercise || []).map((e) => `
    <li><button class="item" data-action="edit-ex" data-id="${e.id}">
      <span class="grow"><span class="name">${esc(e.type)}</span></span>
      <span class="qty">${e.min ? `${e.min} min` : ''}</span></button></li>`).join('');

  return `
    <header class="dayhead">
      <button class="iconbtn" data-action="prev-day" aria-label="Día anterior">‹</button>
      <h1>${dayLabel(state.date)}<small>${esc(longDate(state.date))}</small></h1>
      <button class="iconbtn" data-action="next-day" aria-label="Día siguiente" ${isToday ? 'disabled' : ''}>›</button>
    </header>
    ${isToday ? '' : '<p style="text-align:center;margin:-6px 0 10px"><button class="linkbtn" data-action="go-today">Volver a hoy</button></p>'}

    ${backupWarning()}

    <section class="card" aria-label="Casillas del día">
      <h2>¿Qué he tomado? <span class="sub">${done} de ${checks.length}</span></h2>
      <div class="ticks">${boxes}</div>
      ${usual.length && usualPending ? '<div class="row"><button class="btn soft grow" data-action="usual">✓ Lo de siempre</button></div>' : ''}
    </section>

    <section class="card" aria-label="Galletas del día">
      <h2>Galletas <span class="sub">solo registro</span></h2>
      <div class="ticks">${counters}</div>
    </section>

    <section class="card">
      <h2>Ejercicio</h2>
      ${ex ? `<ul class="items">${ex}</ul>` : '<p class="empty">Nada apuntado.</p>'}
      <div class="row"><button class="btn primary grow" data-action="add-ex">+ Añadir ejercicio</button></div>
    </section>

    ${renderWeekSummary(state)}

    <section class="card">
      <h2>Notas del día</h2>
      <textarea id="notes" placeholder="Por ejemplo: día caótico, comí una empanada">${esc(day.notes || '')}</textarea>
    </section>`;
}

// ---------- Copias de seguridad ----------
const DAY_MS = 86400000;
function daysSinceBackup() {
  const t = state.data.settings.lastBackupAt;
  return t ? Math.floor((Date.now() - new Date(t).getTime()) / DAY_MS) : null;
}
function backupWarning() {
  const n = Object.values(state.data.days).filter(hasData).length;
  const since = daysSinceBackup();
  if (!n || (since != null && since < 7) || (since == null && n < 3)) return '';
  return `<section class="card warncard">
      <b>${since == null ? 'Aún no has hecho ninguna copia' : `Hace ${since} días de tu última copia`}</b>
      <p class="hint">Si borras la app o cambias de iPhone, se pierde lo apuntado. Guarda una copia en Archivos o iCloud Drive.</p>
      <div class="row"><button class="btn primary grow" data-action="export">Hacer copia ahora</button></div>
    </section>`;
}

async function doExport() {
  const data = await storage.exportAll();
  const name = `rutina-ldl-${todayKey()}.json`;
  const json = JSON.stringify(data, null, 1);
  const file = new File([json], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Copia de Rutina LDL' });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return; // cancelado: no cuenta como copia
    alert('No se pudo exportar: ' + (err.message || err));
    return;
  }
  const s = { ...state.data.settings, lastBackupAt: new Date().toISOString() };
  await storage.saveSettings(s);
  state.data.settings = s;
  render();
}

function pickImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async () => {
    const f = input.files && input.files[0];
    if (!f) return;
    let raw;
    try { raw = JSON.parse(await f.text()); } catch (_) { alert('El archivo no es una copia válida.'); return; }
    if (!raw || raw.app !== 'rutina-ldl' || typeof raw.days !== 'object') { alert('Ese archivo no es una copia de Rutina LDL.'); return; }
    openImportSummary(raw);
  };
  input.click();
}

function openImportSummary(raw) {
  const keys = Object.keys(raw.days).sort();
  const local = Object.keys(state.data.days).filter((k) => hasData(state.data.days[k]));
  const overlap = keys.filter((k) => state.data.days[k]).length;
  const when = raw.exportedAt ? new Date(raw.exportedAt).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' }) : 'fecha desconocida';
  sheet.innerHTML = `
    <div class="sheet-inner">
      <div class="sheet-head"><h3>Importar copia</h3><button class="linkbtn" data-close>Cerrar</button></div>
      <div class="sheet-body">
        <p>Copia del <b>${esc(when)}</b>.</p>
        <p class="hint">Contiene ${keys.length} ${keys.length === 1 ? 'día' : 'días'}${keys.length ? ` (del ${esc(longDate(keys[0]))} al ${esc(longDate(keys[keys.length - 1]))})` : ''}.
          En este iPhone hay ${local.length} ${local.length === 1 ? 'día apuntado' : 'días apuntados'}; ${overlap} ${overlap === 1 ? 'coincide' : 'coinciden'} con la copia.</p>
        <p class="hint"><b>Combinar:</b> añade los días de la copia; si un día está en los dos sitios, gana el de la copia. El resto se conserva.<br>
          <b>Reemplazar:</b> borra todo lo de este iPhone y deja solo lo de la copia.</p>
      </div>
      <div class="sheet-foot">
        <button class="btn danger" data-mode="replace">Reemplazar</button>
        <button class="btn primary grow" data-mode="merge">Combinar</button>
      </div>
    </div>`;
  sheet.onclick = async (e) => {
    if (e.target === sheet || e.target.closest('[data-close]')) return closeSheet();
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    const mode = b.dataset.mode;
    if (mode === 'replace' && !confirm('Se borrará todo lo apuntado en este iPhone y se quedará solo lo de la copia. ¿Seguir?')) return;
    try {
      await storage.importAll(raw, mode);
      state.data = await storage.loadAll();
      closeSheet(); render();
      alert('Copia importada.');
    } catch (err) {
      alert('No se pudo importar: ' + (err.message || err));
    }
  };
  showSheet();
}

function renderSettings() {
  const s = state.data.settings;
  const rows = CHECKS.map((c) => {
    const cur = { ...c, ...(s.checks[c.id] || {}) };
    return `<label class="check"><input type="checkbox" data-action="check-enabled" data-id="${c.id}" ${cur.enabled ? 'checked' : ''}>
      <span class="grow">${esc(c.label)}<small class="hint" style="display:block">Objetivo: ${cur.target} ${cur.target === 1 ? 'día' : 'días'} por semana</small></span></label>`;
  }).join('');
  return `
    <header class="dayhead"><h1>Ajustes</h1></header>
    <section class="card">
      <h2>Casillas</h2>
      ${rows}
    </section>
    <section class="card">
      <h2>Datos de los alimentos</h2>
      ${Object.values(FOODS).map(foodInfo).join('')}
      <p class="hint">Los valores estimados son aproximados: la etiqueta no los declara.</p>
    </section>
    <section class="card">
      <h2>Ejercicio por semana</h2>
      <p class="hint">Aeróbico: ${s.goals.aerobicMin} min · Fuerza: ${s.goals.strengthMin} ${s.goals.strengthMin === 1 ? "sesión" : "sesiones"}.</p>
    </section>
    <section class="card">
      <h2>Copias de seguridad</h2>
      <p class="hint">Última copia: <b>${daysSinceBackup() == null ? 'nunca' : daysSinceBackup() === 0 ? 'hoy' : `hace ${daysSinceBackup()} ${daysSinceBackup() === 1 ? 'día' : 'días'}`}</b>.</p>
      <div class="row">
        <button class="btn primary grow" data-action="export">Exportar copia</button>
        <button class="btn soft grow" data-action="import">Importar copia</button>
      </div>
      <p class="hint">Exportar crea un archivo que puedes guardar en Archivos / iCloud Drive o enviarte. Para cambiar de iPhone: exporta aquí, instala la app en el nuevo e importa el archivo.</p>
    </section>
    <section class="card">
      <h2>Datos en este dispositivo</h2>
      <p class="hint">Todo lo que apuntas se guarda solo en este dispositivo. Nada sale de aquí salvo cuando exportes una copia.</p>
      <p class="hint">Protección contra borrado automático: <b>${state.persisted ? 'concedida' : 'no concedida (en iPhone se concede al instalar la app en la pantalla de inicio)'}</b>.</p>
      <p class="hint">Días con datos: ${Object.keys(state.data.days).length}.</p>
    </section>
    <p class="note">Rutina LDL · versión ${APP_VERSION}</p>`;
}

function foodInfo(f) {
  const beta = f.perUnit ? `${num(f.perUnit.beta)} g por ${f.unit}` : `${num(f.betaPerG, 3)} g por g`;
  const rest = f.perUnit ? `${num(f.perUnit.kcal, 0)} kcal y ${num(f.perUnit.sat)} g de saturadas por ${f.unit}`
    : `${num(f.per100.kcal, 0)} kcal y ${num(f.per100.sat)} g de saturadas por 100 g`;
  const weight = f.gramsPerUnit ? ` · 1 ${f.unit} = ${f.gramsPerUnit} g${f.gramsEstimated ? ' (por pesar)' : ''}` : '';
  return `<p class="food"><b>${esc(f.name)}</b><span class="hint">${esc(f.note)}${weight}</span>
    <span class="hint">Beta-glucanos: ${beta} (${f.source})</span><span class="hint">${rest}</span></p>`;
}

// ---------- Hoja: ejercicio ----------
function openExercise(id) {
  const day = currentDay();
  const existing = id ? (day.exercise || []).find((e) => e.id === id) : null;
  let type = existing ? existing.type : EXERCISE_TYPES[0];
  const initial = existing ? existing.min : 30;
  sheet.innerHTML = `
    <div class="sheet-inner">
      <div class="sheet-head"><h3>${existing ? 'Editar ejercicio' : 'Añadir ejercicio'}</h3>
        <button class="linkbtn" data-close>Cerrar</button></div>
      <div class="sheet-body">
        <div class="field">Tipo</div>
        <div class="quick">${EXERCISE_TYPES.map((t) => `<button class="btn" data-type="${esc(t)}">${esc(t)}</button>`).join('')}</div>
        <div class="field">Minutos</div>
        <div class="quick">${[15, 30, 45, 60, 90].map((q) => `<button class="btn" data-q="${q}">${q}</button>`).join('')}</div>
        <label class="qtyrow"><input id="qty" type="number" inputmode="numeric" min="0" step="1" value="${initial}"> <span>min</span></label>
        <p class="hint">La fuerza cuenta como sesión; el resto suma minutos de aeróbico.</p>
      </div>
      <div class="sheet-foot">
        ${existing ? '<button class="btn danger" data-delete>Borrar</button>' : ''}
        <button class="btn primary grow" data-save>${existing ? 'Guardar' : 'Añadir'}</button>
      </div>
    </div>`;
  const input = sheet.querySelector('#qty');
  const mark = () => {
    sheet.querySelectorAll('[data-type]').forEach((b) => b.classList.toggle('sel', b.dataset.type === type));
    sheet.querySelectorAll('[data-q]').forEach((b) => b.classList.toggle('sel', Number(b.dataset.q) === Number(input.value)));
  };
  input.oninput = mark;
  mark();
  sheet.onclick = async (e) => {
    if (e.target === sheet || e.target.closest('[data-close]')) return closeSheet();
    const tb = e.target.closest('[data-type]');
    if (tb) { type = tb.dataset.type; mark(); return; }
    const qb = e.target.closest('[data-q]');
    if (qb) { input.value = qb.dataset.q; mark(); return; }
    if (e.target.closest('[data-delete]')) {
      await updateDay((d) => { d.exercise = d.exercise.filter((x) => x.id !== id); });
      closeSheet(); render(); return;
    }
    if (e.target.closest('[data-save]')) {
      const min = Math.max(0, Math.round(Number(String(input.value).replace(',', '.')) || 0));
      if (!min && type !== 'Fuerza') { input.focus(); return; }
      await updateDay((d) => {
        if (existing) Object.assign(d.exercise.find((x) => x.id === id) || {}, { type, min });
        else d.exercise.push({ id: uid(), type, min });
      });
      closeSheet(); render();
    }
  };
  showSheet();
}

function showSheet() { if (!sheet.open) sheet.showModal(); sheet.querySelector('.sheet-body')?.scrollTo(0, 0); }
function closeSheet() { if (sheet.open) sheet.close(); }

// ---------- Eventos de la vista ----------
view.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (a === 'prev-day') { state.date = addDays(state.date, -1); render(); window.scrollTo(0, 0); }
  else if (a === 'next-day') { if (state.date < todayKey()) { state.date = addDays(state.date, 1); render(); window.scrollTo(0, 0); } }
  else if (a === 'go-today') { state.date = todayKey(); render(); window.scrollTo(0, 0); }
  else if (a === 'toggle') {
    const id = el.dataset.id;
    await updateDay((d) => { if (d.checks[id]) delete d.checks[id]; else d.checks[id] = true; });
    const y = window.scrollY; render(); window.scrollTo(0, y);
  }
  else if (a === 'count' || a === 'count-toggle') {
    const id = el.dataset.id;
    const step = Number(el.dataset.d) || 0;
    await updateDay((d) => {
      const counts = d.counts || (d.counts = {});
      const cur = counts[id] || 0;
      const n = a === 'count' ? Math.min(MAX_COUNT, Math.max(0, cur + step)) : cur ? 0 : 1;
      if (n) counts[id] = n; else delete counts[id];
    });
    const y = window.scrollY; render(); window.scrollTo(0, y);
  }
  else if (a === 'usual') {
    const ids = state.data.settings.usual || [];
    await updateDay((d) => { for (const id of ids) d.checks[id] = true; });
    const y = window.scrollY; render(); window.scrollTo(0, y);
  }
  else if (a === 'export') doExport();
  else if (a === 'import') pickImport();
  else if (a === 'add-ex') openExercise(null);
  else if (a === 'edit-ex') openExercise(el.dataset.id);
  else if (a === 'open-day') { state.date = el.dataset.date; goTab('hoy'); }
  else if (a === 'open-week') { state.weekStart = weekStart(state.date); goTab('semana'); }
  else if (a === 'open-week-start') { state.weekStart = el.dataset.start; goTab('semana'); }
  else if (a === 'prev-week') { state.weekStart = addDays(state.weekStart || weekStart(todayKey()), -7); render(); }
  else if (a === 'next-week') { const n = addDays(state.weekStart || weekStart(todayKey()), 7); if (n <= weekStart(todayKey())) { state.weekStart = n; render(); } }
  else if (a === 'this-week') { state.weekStart = weekStart(todayKey()); render(); }
  else if (a === 'history-mode') { state.historyMode = el.dataset.mode; render(); }
});

view.addEventListener('change', async (e) => {
  if (e.target.matches('[data-action="check-enabled"]')) {
    const id = e.target.dataset.id;
    const s = structuredClone(state.data.settings);
    s.checks[id] = { ...(s.checks[id] || {}), enabled: e.target.checked };
    await storage.saveSettings(s);
    state.data.settings = s;
  }
});

let notesTimer = null;
view.addEventListener('input', (e) => {
  if (e.target.id !== 'notes') return;
  const v = e.target.value;
  const date = state.date;
  clearTimeout(notesTimer);
  notesTimer = setTimeout(() => { notesTimer = null; updateDay((d) => { d.notes = v; }, date); }, 400);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    const ta = document.getElementById('notes');
    if (ta && notesTimer) { clearTimeout(notesTimer); notesTimer = null; ta.dispatchEvent(new Event('input', { bubbles: true })); }
  } else if (state.data && state.tab === 'hoy' && !sheet.open) {
    if (state.lastSeenToday && state.lastSeenToday !== todayKey() && state.date === state.lastSeenToday) state.date = todayKey();
    state.lastSeenToday = todayKey();
    render();
  }
});

document.querySelector('.tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  if (b.dataset.tab === 'semana' && state.tab !== 'semana') state.weekStart = weekStart(todayKey());
  goTab(b.dataset.tab);
});

function goTab(tab) {
  state.tab = tab;
  render();
  window.scrollTo(0, 0);
}


// ---------- Arranque ----------
async function start() {
  try {
    state.data = await storage.loadAll();
    state.lastSeenToday = todayKey();
    render();
    state.persisted = await storage.requestPersist();
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="placeholder"><h1>No se pudieron cargar los datos</h1><p>${esc(err.message || err)}</p>
      <p>Prueba a cerrar y volver a abrir la app. Si usas Safari en modo privado, sal de ese modo.</p></div>`;
  }
}

if ('serviceWorker' in navigator) {
  let reloaded = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded || sheet.open) return;
    reloaded = true;
    location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => reg.update()).catch((e) => console.warn('SW', e));
  });
}

start();
