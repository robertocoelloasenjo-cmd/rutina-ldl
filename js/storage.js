// Capa de almacenamiento. TODO el acceso a datos pasa por aquí.
// Hoy usa IndexedDB del propio dispositivo. Para cambiar a otro sistema
// (por ejemplo, sincronizar con un repositorio privado) basta con reescribir este módulo
// manteniendo las mismas funciones.

import { SCHEMA_VERSION, DEFAULT_FOODS, DEFAULT_TEMPLATES, defaultSettings, emptyDay } from './defaults.js';

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
// Recibe un objeto completo { schemaVersion, settings, foods, templates, days }
// y lo devuelve en la versión actual. Añadir aquí un paso por cada cambio de modelo.
export function migrate(data) {
  const d = { ...data };
  let v = Number(d.schemaVersion || 1);
  if (v > SCHEMA_VERSION) {
    throw new Error(`El archivo es de una versión más nueva de la app (${v}). Actualiza la app primero.`);
  }
  // Ejemplo para el futuro:
  // if (v === 1) { ...transformar...; v = 2; }
  d.schemaVersion = v;
  d.settings = { ...defaultSettings(), ...(d.settings || {}) };
  d.settings.goals = { ...defaultSettings().goals, ...(d.settings.goals || {}) };
  d.foods = Array.isArray(d.foods) ? d.foods : DEFAULT_FOODS;
  d.templates = Array.isArray(d.templates) ? d.templates : DEFAULT_TEMPLATES;
  d.days = d.days && typeof d.days === 'object' ? d.days : {};
  for (const k of Object.keys(d.days)) d.days[k] = normalizeDay(d.days[k]);
  return d;
}

function normalizeDay(day) {
  const base = emptyDay();
  const out = { ...base, ...(day || {}) };
  out.meals = { ...base.meals, ...((day && day.meals) || {}) };
  return out;
}

// ---------- API pública ----------

/** Carga todo. Si es el primer arranque, guarda los valores iniciales. */
export async function loadAll() {
  let schemaVersion = await getMeta('schemaVersion');
  let settings = await getMeta('settings');
  let foods = await getMeta('foods');
  let templates = await getMeta('templates');
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
  const data = migrate({ schemaVersion: schemaVersion || SCHEMA_VERSION, settings, foods, templates, days });
  const seeded = await getMeta('seededFoods');
  const foodsChanged = addNewDefaultFoods(data, seeded);
  if (firstRun || schemaVersion !== SCHEMA_VERSION || foodsChanged) {
    await setMeta('schemaVersion', SCHEMA_VERSION);
    await setMeta('settings', data.settings);
    await setMeta('foods', data.foods);
    await setMeta('templates', data.templates);
    await setMeta('seededFoods', DEFAULT_FOODS.map((f) => f.id));
  }
  return data;
}

/**
 * Cuando una versión nueva de la app trae alimentos nuevos en el catálogo inicial,
 * se añaden a los guardados (solo una vez: si luego borras uno, no vuelve).
 * También completa campos nuevos (p. ej. ldlScore) en alimentos que ya existían,
 * sin tocar lo que ya tenga valor.
 */
function addNewDefaultFoods(data, seededIds) {
  const seeded = new Set(seededIds || data.foods.map((f) => f.id));
  const byId = new Map(data.foods.map((f) => [f.id, f]));
  let changed = !seededIds;
  for (const def of DEFAULT_FOODS) {
    const cur = byId.get(def.id);
    if (cur) {
      for (const k of Object.keys(def)) {
        if (cur[k] === undefined) { cur[k] = def[k]; changed = true; }
      }
    } else if (!seeded.has(def.id)) {
      data.foods.push(structuredClone(def));
      changed = true;
    }
  }
  return changed;
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
export async function getFoods() { return (await getMeta('foods')) || DEFAULT_FOODS; }
export async function saveFoods(foods) { await setMeta('foods', foods); }
export async function getTemplates() { return (await getMeta('templates')) || DEFAULT_TEMPLATES; }
export async function saveTemplates(templates) { await setMeta('templates', templates); }

/** Devuelve un objeto listo para guardar como JSON. */
export async function exportAll() {
  const data = await loadAll();
  return {
    app: 'rutina-ldl',
    exportedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
    settings: data.settings,
    foods: data.foods,
    templates: data.templates,
    days: data.days,
  };
}

/**
 * Importa un objeto exportado.
 * mode 'merge': los días del archivo pisan los mismos días locales; el resto se conserva.
 *               Ajustes, catálogo y plantillas se toman del archivo.
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
    meta.put(data.foods, 'foods');
    meta.put(data.templates, 'templates');
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
