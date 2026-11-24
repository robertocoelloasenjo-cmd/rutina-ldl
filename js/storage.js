// Capa de almacenamiento. TODO el acceso a datos pasa por aquí.
// Hoy usa IndexedDB del propio dispositivo. Para cambiar a otro sistema
// (por ejemplo, sincronizar con un repositorio privado) basta con reescribir este módulo
// manteniendo las mismas funciones.

import { SCHEMA_VERSION, defaultSettings, emptyDay } from './defaults.js';

const DB_NAME = 'rutina-ldl';
const DB_VERSION = 1;
const DAYS = 'days';
const META = 'meta';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DAYS)) db.createObjectStore(DAYS);
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('La base de datos está bloqueada por otra pestaña.'));
  });
  return dbPromise;
}

function tx(storeNames, mode, fn) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(storeNames, mode);
    let result;
    Promise.resolve(fn(t)).then((r) => { result = r; }, reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Transacción cancelada'));
  }));
}

const reqP = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

async function getMeta(key) {
  return tx([META], 'readonly', (t) => reqP(t.objectStore(META).get(key)));
}
async function setMeta(key, value) {
  return tx([META], 'readwrite', (t) => { t.objectStore(META).put(value, key); });
}

// ---------- Migraciones ----------
// Recibe un objeto completo { schemaVersion, settings, days, foods? } y lo devuelve en la versión actual.
export function migrate(data) {
  const d = { ...data };
  let v = Number(d.schemaVersion || 1);
  if (v > SCHEMA_VERSION) {
    throw new Error(`El archivo es de una versión más nueva de la app (${v}). Actualiza la app primero.`);
  }
  d.days = d.days && typeof d.days === 'object' ? { ...d.days } : {};
  if (v === 1) {
    // De comidas con alimentos y cantidades a casillas.
    const foods = Object.fromEntries((Array.isArray(d.foods) ? d.foods : []).map((f) => [f.id, f]));
    for (const k of Object.keys(d.days)) d.days[k] = dayFromV1(d.days[k], foods);
    const old = (d.settings && d.settings.goals) || {};
    d.settings = { lastBackupAt: (d.settings && d.settings.lastBackupAt) || null,
      goals: { aerobicMin: old.aerobicMin, strengthMin: old.strengthMin } };
    v = 2;
  }
  if (v === 2) {
    // Objetivos semanales algo más bajos y sin casilla de aceite: se toman los nuevos valores por defecto.
    const old = d.settings || {};
    d.settings = { ...old, goals: {},
      checks: Object.fromEntries(Object.entries(old.checks || {}).map(([k, c]) => [k, { enabled: !!(c && c.enabled) }])) };
    v = 3;
  }
  delete d.foods; delete d.templates;
  d.schemaVersion = v;
  const def = defaultSettings();
  const s = d.settings || {};
  d.settings = { ...def, ...s,
    goals: { ...def.goals, ...Object.fromEntries(Object.entries(s.goals || {}).filter(([, x]) => x != null)) },
    checks: Object.fromEntries(Object.entries(def.checks).map(([k, c]) => [k, { ...c, ...((s.checks || {})[k] || {}) }])) };
  for (const k of Object.keys(d.days)) d.days[k] = normalizeDay(d.days[k]);
  return d;
}

function dayFromV1(day, foods) {
  const meals = (day && day.meals) || {};
  const has = (mealIds, test) => mealIds.some((m) => (meals[m] || []).some((it) => {
    const f = foods[it.foodId] || {};
    const c = f.contributes || {};
    return test(it.foodId || '', c);
  }));
  const ALL = ['desayuno', 'comida', 'merienda', 'cena'];
  const avena = (id, c) => c.betaGlucanPerG > 0 || /avena/.test(id);
  const checks = {};
  if (has(['desayuno'], avena)) checks.avenaDesayuno = true;
  if (has(['cena', 'merienda', 'comida'], avena)) checks.avenaCena = true;
  if (has(ALL, (id, c) => c.nutsPerG > 0 || /nuez|nueces|almendra|pistacho|avellana/.test(id))) checks.frutosSecos = true;
  if (has(ALL, (id, c) => c.legumePerUnit > 0)) checks.legumbre = true;
  if (has(ALL, (id, c) => c.sterolsPerUnit > 0 || /danacol/.test(id))) checks.danacol = true;
  if (has(ALL, (id) => /aceite-oliva|aove/.test(id))) checks.aceite = true;
  if (has(ALL, (id, c) => c.oilyFishPerUnit > 0)) checks.pescado = true;
  const exercise = [];
  if (Number(day && day.aerobicMin) > 0) exercise.push({ id: 'm1', type: 'Otro', min: Number(day.aerobicMin) });
  if (day && day.strength) exercise.push({ id: 'm2', type: 'Fuerza', min: 0 });
  return { checks, exercise, notes: (day && day.notes) || '', updatedAt: (day && day.updatedAt) || null, legacyMeals: meals };
}

function normalizeDay(day) {
  const base = emptyDay();
  const out = { ...base, ...(day || {}) };
  out.checks = { ...((day && day.checks) || {}) };
  out.counts = { ...((day && day.counts) || {}) };
  out.exercise = Array.isArray(day && day.exercise) ? day.exercise : [];
  return out;
}

// ---------- API pública ----------

/** Carga todo. Si es el primer arranque o hay que migrar, guarda el resultado. */
export async function loadAll() {
  const schemaVersion = await getMeta('schemaVersion');
  const settings = await getMeta('settings');
  const foods = await getMeta('foods');
  const days = {};
  await tx([DAYS], 'readonly', (t) => new Promise((resolve, reject) => {
    const req = t.objectStore(DAYS).openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (c) { days[c.key] = c.value; c.continue(); } else resolve();
    };
    req.onerror = () => reject(req.error);
  }));

  const firstRun = schemaVersion == null;
  const data = migrate({ schemaVersion: schemaVersion || SCHEMA_VERSION, settings, foods, days });
  if (firstRun || schemaVersion !== SCHEMA_VERSION) {
    await tx([DAYS, META], 'readwrite', (t) => {
      const ds = t.objectStore(DAYS);
      for (const [k, v] of Object.entries(data.days)) ds.put(v, k);
      const m = t.objectStore(META);
      m.put(SCHEMA_VERSION, 'schemaVersion');
      m.put(data.settings, 'settings');
    });
  }
  return data;
}

export async function getDay(date) {
  const d = await tx([DAYS], 'readonly', (t) => reqP(t.objectStore(DAYS).get(date)));
  return normalizeDay(d);
}

export async function saveDay(date, day) {
  const value = { ...day, updatedAt: new Date().toISOString() };
  await tx([DAYS], 'readwrite', (t) => { t.objectStore(DAYS).put(value, date); });
  return value;
}

export async function deleteDay(date) {
  await tx([DAYS], 'readwrite', (t) => { t.objectStore(DAYS).delete(date); });
}

export async function getSettings() { return (await getMeta('settings')) || defaultSettings(); }
export async function saveSettings(settings) { await setMeta('settings', settings); }

/** Devuelve un objeto listo para guardar como JSON. */
export async function exportAll() {
  const data = await loadAll();
  return {
    app: 'rutina-ldl',
    exportedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
    settings: data.settings,
    days: data.days,
  };
}

/**
 * Importa un objeto exportado.
 * mode 'merge': los días del archivo pisan los mismos días locales; el resto se conserva.
 *               Los ajustes se toman del archivo.
 * mode 'replace': borra todo lo local y deja solo lo del archivo.
 */
export async function importAll(raw, mode = 'merge') {
  const data = migrate(raw);
  await tx([DAYS, META], 'readwrite', (t) => {
    const daysStore = t.objectStore(DAYS);
    const meta = t.objectStore(META);
    if (mode === 'replace') daysStore.clear();
    for (const [date, day] of Object.entries(data.days)) daysStore.put(day, date);
    meta.put(SCHEMA_VERSION, 'schemaVersion');
    meta.put(data.settings, 'settings');
  });
}

/** Pide al navegador que no borre los datos. Devuelve true si lo concede. */
export async function requestPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch (_) { /* sin soporte */ }
  return false;
}
