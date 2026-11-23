import * as storage from './storage.js';
import { MEALS, CATEGORIES, LDL_SCORES, emptyDay } from './defaults.js';
import { dayTotals, itemContribution, contributionText, qtyText, suggestions, DAILY_INDICATORS, nf, pluralUnit,
  itemScore, itemName, scoreInfo, mealQuality, dayQuality } from './calc.js';

export const APP_VERSION = '0.2.0';

const view = document.getElementById('view');
const sheet = document.getElementById('sheet');

const state = {
  data: null,        // { settings, foods, templates, days }
  foodsById: {},
  date: todayKey(),
  tab: 'hoy',
  persisted: false,
};

// ---------- Fechas (siempre en hora local) ----------
function todayKey() { return dateKey(new Date()); }
function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); }
function dayLabel(k) {
  const t = todayKey();
  if (k === t) return 'Hoy';
  if (k === addDays(t, -1)) return 'Ayer';
  return capitalize(parseKey(k).toLocaleDateString('es-ES', { weekday: 'long' }));
}
function longDate(k) { return parseKey(k).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }); }
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- Utilidades ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function currentDay() {
  return state.data.days[state.date] || emptyDay();
}
async function updateDay(mutator) {
  const day = structuredClone(currentDay());
  mutator(day);
  const saved = await storage.saveDay(state.date, day);
  state.data.days[state.date] = saved;
}

// ---------- Render principal ----------
function render() {
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === state.tab));
  if (state.tab === 'hoy') view.innerHTML = renderToday();
  else if (state.tab === 'ajustes') view.innerHTML = renderSettings();
  else view.innerHTML = renderPlaceholder(state.tab);
}

function renderToday() {
  const day = currentDay();
  const goals = state.data.settings.goals;
  const totals = dayTotals(day, state.foodsById);
  const isToday = state.date === todayKey();
  const sugg = suggestions(totals, goals, state.data.foods, isToday);

  const inds = DAILY_INDICATORS.map((ind) => {
    const goal = Number(goals[ind.key]) || 0;
    const val = totals[ind.total];
    const pct = goal > 0 ? Math.min(100, (val / goal) * 100) : 0;
    const done = goal > 0 && val >= goal - 1e-9;
    const pending = Math.max(0, goal - val);
    return `
      <div class="ind">
        <div class="ind-top"><b>${ind.label}</b>
          <span class="val">${nf(val, ind.dec)} / ${nf(goal, 1)} ${ind.unit}</span></div>
        <div class="bar ${done ? '' : 'part'}"><span style="width:${pct.toFixed(1)}%"></span></div>
        ${done ? '<span class="ok">✓ Cumplido</span>'
               : `<p class="hint">${esc(sugg[ind.key] || `Pendiente: ${nf(pending, ind.dec)} ${ind.unit}`)}</p>`}
      </div>`;
  }).join('');

  const chips = [];
  if (totals.legume > 0) chips.push(`<span class="chip">Legumbre ${nf(totals.legume)} ${totals.legume === 1 ? 'ración' : 'raciones'}${totals.legume >= 0.5 ? ' · cuenta' : ''}</span>`);
  if (totals.oilyFish > 0) chips.push(`<span class="chip">Pescado azul ×${nf(totals.oilyFish)}</span>`);
  if (totals.redMeat > 0) chips.push(`<span class="chip warn">Carne roja ×${nf(totals.redMeat)}</span>`);
  if (totals.cheese > 0) chips.push(`<span class="chip warn">Queso ×${nf(totals.cheese)}</span>`);

  const meals = MEALS.map((m) => renderMeal(m, day)).join('');
  const dq = dayQuality(day, state.foodsById);
  const quality = dq.count ? `
      <div class="quality">
        <div class="ind-top"><b>Calidad de las comidas</b><span class="badge ${dq.cls}">${dq.label} · ${dq.score > 0 ? '+' : ''}${dq.score}</span></div>
        <p class="hint">${dq.pos} ${dq.pos === 1 ? 'alimento' : 'alimentos'} a favor del colesterol · ${dq.neg} en contra${dq.negatives.length ? ': ' + esc(dq.negatives.join(', ')) : ''}.</p>
      </div>` : '';

  return `
    <header class="dayhead">
      <button class="iconbtn" data-action="prev-day" aria-label="Día anterior">‹</button>
      <h1>${dayLabel(state.date)}<small>${esc(longDate(state.date))}</small></h1>
      <button class="iconbtn" data-action="next-day" aria-label="Día siguiente" ${isToday ? 'disabled' : ''}>›</button>
    </header>
    ${isToday ? '' : '<p style="text-align:center;margin:-6px 0 10px"><button class="linkbtn" data-action="go-today">Volver a hoy</button></p>'}

    <section class="card" aria-label="Panel del día">
      <h2>Objetivos del día</h2>
      ${inds}
      ${chips.length ? `<div class="chips">${chips.join('')}</div>` : ''}
      ${quality}
    </section>

    ${meals}

    <section class="card">
      <h2>Ejercicio</h2>
      <div class="stepper">
        <button class="btn" data-action="aero" data-delta="-15" aria-label="Quitar 15 minutos">−15</button>
        <span class="num">${nf(day.aerobicMin || 0, 0)} min</span>
        <button class="btn" data-action="aero" data-delta="15" aria-label="Añadir 15 minutos">+15</button>
      </div>
      <label class="check"><input type="checkbox" data-action="strength" ${day.strength ? 'checked' : ''}> Sesión de fuerza</label>
    </section>

    <section class="card">
      <h2>Notas del día</h2>
      <textarea id="notes" placeholder="Cómo me he sentido, comidas fuera, etc.">${esc(day.notes || '')}</textarea>
    </section>

    <p class="note">Los aportes son estimaciones aproximadas a partir de factores editables. No sustituyen el consejo médico.</p>`;
}

function renderMeal(m, day) {
  const items = day.meals[m.id] || [];
  const tpl = state.data.templates.find((t) => t.meal === m.id);
  const list = items.length ? `<ul class="items">${items.map((it) => {
    const f = state.foodsById[it.foodId];
    if (!f) return `<li><button class="item" data-action="edit-item" data-meal="${m.id}" data-id="${it.id}"><span class="name">Alimento borrado del catálogo</span></button></li>`;
    const c = contributionText(itemContribution(f, Number(it.qty) || 0));
    const si = scoreInfo(itemScore(it, f));
    return `<li><button class="item" data-action="edit-item" data-meal="${m.id}" data-id="${it.id}">
      <span class="dot ${si.cls}" title="${si.label}">${si.short}</span>
      <span class="grow"><span class="name">${esc(itemName(it, f))}</span>${c ? `<span class="meta">${esc(c)}</span>` : ''}</span>
      <span class="qty">${esc(qtyText(f, Number(it.qty) || 0))}</span></button></li>`;
  }).join('')}</ul>` : '<p class="empty">Nada apuntado.</p>';

  return `
    <section class="card">
      <h2>${m.name}${items.length ? (() => { const q = mealQuality(items, state.foodsById); return `<span class="badge ${q.cls}">${q.label}</span>`; })() : ''}</h2>
      ${list}
      <div class="row">
        <button class="btn primary grow" data-action="add" data-meal="${m.id}">+ Añadir</button>
        ${tpl && tpl.items.length ? `<button class="btn soft grow" data-action="template" data-meal="${m.id}">${esc(tpl.name)}</button>` : ''}
      </div>
    </section>`;
}

function renderPlaceholder(tab) {
  const names = { semana: ['Semana', 'fase 2'], historial: ['Historial', 'fase 2'] };
  const [n, f] = names[tab] || [tab, ''];
  return `<div class="placeholder"><h1>${n}</h1><p>Esta pantalla llega en la ${f}.</p></div>`;
}

function renderSettings() {
  return `
    <header class="dayhead"><h1>Ajustes</h1></header>
    <section class="card">
      <h2>Datos en este dispositivo</h2>
      <p class="hint">Todo lo que apuntas se guarda solo en este dispositivo. Nada sale de aquí salvo cuando exportes una copia.</p>
      <p class="hint">Protección contra borrado automático: <b>${state.persisted ? 'concedida' : 'no concedida (en iPhone se concede al instalar la app en la pantalla de inicio)'}</b>.</p>
      <p class="hint">Días con datos: ${Object.keys(state.data.days).length}.</p>
    </section>
    <section class="card">
      <h2>Próximamente</h2>
      <p class="hint">Objetivos, catálogo y plantillas editables (fase 4) y copias de seguridad (fase 3).</p>
    </section>
    <p class="note">Rutina LDL · versión ${APP_VERSION}</p>`;
}

// ---------- Hoja: catálogo y cantidad ----------
function openCatalog(mealId) {
  const meal = MEALS.find((m) => m.id === mealId);
  const foods = state.data.foods;
  const first = foods.filter((f) => (f.meals || []).includes(mealId));
  const rest = foods.filter((f) => !(f.meals || []).includes(mealId));
  const groups = {};
  for (const cat of [...Object.keys(CATEGORIES), ...rest.map((f) => f.category)]) {
    const fs = rest.filter((f) => f.category === cat);
    if (fs.length && !groups[cat]) groups[cat] = fs;
  }

  const btn = (f) => {
    const si = f.custom ? null : scoreInfo(f.ldlScore);
    return `<button class="foodbtn" data-food="${f.id}" data-search="${esc(f.name.toLowerCase())}">
    ${si ? `<span class="dot ${si.cls}">${si.short}</span>` : '<span class="dot s0">✎</span>'}
    <span class="grow">${esc(f.name)}<small>${esc(foodHint(f))}</small></span></button>`;
  };

  sheet.innerHTML = `
    <div class="sheet-inner">
      <div class="sheet-head"><h3>Añadir a ${meal.name.toLowerCase()}</h3>
        <button class="linkbtn" data-close>Cerrar</button></div>
      <div class="sheet-body">
        <input class="search" type="search" placeholder="Buscar alimento" autocomplete="off">
        <div class="group-title">Habituales en ${meal.name.toLowerCase()}</div>
        ${first.map(btn).join('')}
        ${Object.entries(groups).map(([cat, fs]) => `<div class="group-title">${esc(CATEGORIES[cat] || cat)}</div>${fs.map(btn).join('')}`).join('')}
      </div>
    </div>`;
  sheet.onclick = (e) => {
    if (e.target === sheet || e.target.closest('[data-close]')) return closeSheet();
    const fb = e.target.closest('[data-food]');
    if (fb) openQty({ mealId, foodId: fb.dataset.food });
  };
  const search = sheet.querySelector('.search');
  search.oninput = () => {
    const q = search.value.trim().toLowerCase();
    sheet.querySelectorAll('.foodbtn').forEach((b) => { b.hidden = q && !b.dataset.search.includes(q); });
    sheet.querySelectorAll('.group-title').forEach((g) => { g.hidden = !!q; });
  };
  showSheet();
}

function foodHint(f) {
  if (f.custom) return f.ldlNote || '';
  const base = foodHintNutrients(f);
  const si = scoreInfo(f.ldlScore);
  return `${si.label}${f.ldlNote ? ': ' + f.ldlNote : ''}${base ? ' · ' + base : ''}`;
}

function foodHintNutrients(f) {
  const contr = f.contributes || {};
  if (f.unit === 'g' && Number(contr.nutsPerG) === 1 && Object.keys(contr).length === 1) return 'Cuenta entero como frutos secos';
  const c = itemContribution(f, f.unit === 'g' ? 100 : 1);
  const per = f.unit === 'g' ? 'por 100 g' : `por ${f.unit}`;
  const t = contributionText(c);
  return t ? `${t} ${per}` : '';
}

function quickLabel(f, q) {
  if (f.unit === 'g' && f.altUnit) {
    const n = q / f.altUnit.grams;
    if (Math.abs(n - Math.round(n)) < 0.05) {
      const r = Math.round(n);
      return `${r} ${r === 1 ? f.altUnit.name : f.altUnit.plural} (${nf(q, 1)} g)`;
    }
  }
  return f.unit === 'g' ? `${nf(q, 1)} g` : `${nf(q, 2)} ${pluralUnit(f.unit, q)}`;
}

/** Abre la cantidad para añadir ({mealId, foodId}) o editar ({mealId, itemId}). */
function openQty({ mealId, foodId, itemId }) {
  const day = currentDay();
  const existing = itemId ? (day.meals[mealId] || []).find((i) => i.id === itemId) : null;
  const f = state.foodsById[existing ? existing.foodId : foodId];
  if (!f) {
    if (existing && confirm('Este alimento ya no está en el catálogo. ¿Borrar el apunte?')) {
      updateDay((d) => { d.meals[mealId] = d.meals[mealId].filter((i) => i.id !== itemId); }).then(render);
    }
    return;
  }
  const initial = existing ? Number(existing.qty) : (f.quick && f.quick.length ? f.quick[Math.min(1, f.quick.length - 1)] : 1);
  const unitLabel = f.unit === 'g' ? 'g' : pluralUnit(f.unit, 2);

  sheet.innerHTML = `
    <div class="sheet-inner">
      <div class="sheet-head">
        ${existing ? '<span></span>' : '<button class="linkbtn" data-back>‹ Catálogo</button>'}
        <button class="linkbtn" data-close>Cerrar</button></div>
      <div class="sheet-body">
        ${f.custom ? `
        <label class="field">¿Qué has comido?
          <input id="cname" type="text" autocomplete="off" placeholder="Por ejemplo: empanada de atún" value="${esc(existing && existing.name || '')}"></label>
        <div class="field">¿Cómo es para el colesterol?</div>
        <div class="scorepick">${[2, 1, 0, -1, -2].map((v) => `<button class="btn ${LDL_SCORES[v].cls}" data-score="${v}">${LDL_SCORES[v].label}</button>`).join('')}</div>
        <p class="hint">Más favorable: fibra (avena, legumbre, fruta, verdura), frutos secos, aceite de oliva, pescado. Desfavorable: grasa saturada (embutido, queso, mantequilla, bollería, fritos, comida rápida).</p>
        ` : `<h3 style="margin:0 0 4px">${esc(f.name)}</h3>`}
        <p class="hint" style="margin:0" ${f.custom ? 'hidden' : ''}>${esc(foodHint(f))}${f.unit === 'g' && f.altUnit ? ` · 1 ${esc(f.altUnit.name)} ≈ ${nf(f.altUnit.grams, 1)} g` : ''}${f.unit !== 'g' && f.contributes && f.contributes.betaGlucanPerG ? ` · 1 ${esc(f.unit)} ≈ ${nf(f.gramsPerUnit, 1)} g` : ''}</p>
        <div class="quick">${(f.quick || []).map((q) => `<button class="btn" data-q="${q}">${esc(quickLabel(f, q))}</button>`).join('')}</div>
        <label class="qtyrow"><input id="qty" type="number" inputmode="decimal" min="0" step="any" value="${initial}"> <span>${esc(unitLabel)}</span></label>
        <p class="preview" id="preview"></p>
      </div>
      <div class="sheet-foot">
        ${existing ? '<button class="btn danger" data-delete>Borrar</button>' : ''}
        <button class="btn primary grow" data-save>${existing ? 'Guardar' : 'Añadir'}</button>
      </div>
    </div>`;

  const input = sheet.querySelector('#qty');
  const preview = sheet.querySelector('#preview');
  const refresh = () => {
    const q = parseQty(input.value);
    sheet.querySelectorAll('[data-q]').forEach((b) => b.classList.toggle('sel', Number(b.dataset.q) === q));
    const t = q > 0 ? contributionText(itemContribution(f, q)) : '';
    preview.textContent = q > 0 ? (t ? `Aporta: ${t}` : 'Solo registro') : 'Escribe una cantidad mayor que 0';
  };
  input.oninput = refresh;
  refresh();
  let score = existing && existing.score != null ? Number(existing.score) : null;
  const cname = sheet.querySelector('#cname');
  const markScore = () => sheet.querySelectorAll('[data-score]').forEach((b) => b.classList.toggle('sel', Number(b.dataset.score) === score));
  markScore();

  sheet.onclick = async (e) => {
    if (e.target === sheet || e.target.closest('[data-close]')) return closeSheet();
    if (e.target.closest('[data-back]')) return openCatalog(mealId);
    const qb = e.target.closest('[data-q]');
    if (qb) { input.value = qb.dataset.q; refresh(); return; }
    const sb = e.target.closest('[data-score]');
    if (sb) { score = Number(sb.dataset.score); markScore(); return; }
    if (e.target.closest('[data-delete]')) {
      await updateDay((d) => { d.meals[mealId] = d.meals[mealId].filter((i) => i.id !== itemId); });
      closeSheet(); render(); return;
    }
    if (e.target.closest('[data-save]')) {
      const q = parseQty(input.value);
      if (!(q > 0)) { input.focus(); return; }
      let extra = {};
      if (f.custom) {
        const name = cname.value.trim();
        if (!name) { cname.focus(); return; }
        if (score == null) { alert('Elige cómo es para el colesterol.'); return; }
        extra = { name, score };
      }
      await updateDay((d) => {
        if (existing) {
          const it = d.meals[mealId].find((i) => i.id === itemId);
          if (it) Object.assign(it, { qty: q }, extra);
        } else {
          d.meals[mealId].push({ id: uid(), foodId: f.id, qty: q, ...extra });
        }
      });
      closeSheet(); render();
    }
  };
  showSheet();
}

const parseQty = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };

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
  else if (a === 'add') openCatalog(el.dataset.meal);
  else if (a === 'edit-item') openQty({ mealId: el.dataset.meal, itemId: el.dataset.id });
  else if (a === 'template') {
    const tpl = state.data.templates.find((t) => t.meal === el.dataset.meal);
    if (!tpl) return;
    const already = (currentDay().meals[tpl.meal] || []).length > 0;
    if (already && !confirm(`Ya hay alimentos en esta comida. ¿Añadir también "${tpl.name}"?`)) return;
    await updateDay((d) => {
      for (const it of tpl.items) if (state.foodsById[it.foodId]) d.meals[tpl.meal].push({ id: uid(), foodId: it.foodId, qty: it.qty });
    });
    render();
  } else if (a === 'aero') {
    const delta = Number(el.dataset.delta);
    await updateDay((d) => { d.aerobicMin = Math.max(0, (Number(d.aerobicMin) || 0) + delta); });
    render();
  }
});

view.addEventListener('change', async (e) => {
  if (e.target.matches('[data-action="strength"]')) {
    const v = e.target.checked;
    await updateDay((d) => { d.strength = v; });
  }
});

let notesTimer = null;
view.addEventListener('input', (e) => {
  if (e.target.id !== 'notes') return;
  const v = e.target.value;
  const date = state.date;
  clearTimeout(notesTimer);
  notesTimer = setTimeout(async () => {
    const day = structuredClone(state.data.days[date] || emptyDay());
    day.notes = v;
    state.data.days[date] = await storage.saveDay(date, day);
  }, 400);
});
// Guardar notas pendientes si la app pasa a segundo plano.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    const ta = document.getElementById('notes');
    if (ta && notesTimer) { clearTimeout(notesTimer); notesTimer = null; ta.dispatchEvent(new Event('input', { bubbles: true })); }
  } else if (state.tab === 'hoy' && !sheet.open) {
    // Si la app se reabre otro día, mostrar el día actual.
    if (state.lastSeenToday && state.lastSeenToday !== todayKey() && state.date === state.lastSeenToday) state.date = todayKey();
    state.lastSeenToday = todayKey();
    render();
  }
});

document.querySelector('.tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  state.tab = b.dataset.tab;
  render();
  window.scrollTo(0, 0);
});

// ---------- Arranque ----------
async function start() {
  try {
    state.data = await storage.loadAll();
    state.foodsById = Object.fromEntries(state.data.foods.map((f) => [f.id, f]));
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
  // Cuando se publica una versión nueva, el service worker nuevo toma el control y recargamos una vez.
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
