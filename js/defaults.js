// Valores iniciales. Versión simplificada (esquema 2):
// cada día solo se marcan casillas de alimentos MUY positivos para el LDL,
// más el ejercicio (tipo y minutos) y una nota libre.

export const SCHEMA_VERSION = 3;

// Casillas diarias. "target" = días por semana que se buscan.
// Las casillas con "portions" se marcan con media ración o ración entera y su objetivo
// son raciones por semana. En los datos del día se guarda 0.5 o 1; true (días apuntados
// antes de existir las medias raciones) cuenta como 1.
// Base: Portfolio Diet (fibra viscosa, frutos secos, proteína vegetal, esteroles,
// grasa monoinsaturada) y declaraciones de salud de la EFSA.
export const CHECKS = [
  { id: 'avenaDesayuno', label: 'Avena en el desayuno', hint: 'Copos o salvado de avena (beta-glucanos)', group: 'avena', target: 6, enabled: true },
  { id: 'avenaCena', label: 'Avena en la cena', hint: 'Copos o salvado de avena (beta-glucanos)', group: 'avena', target: 6, enabled: true },
  { id: 'frutosSecos', label: 'Frutos secos', hint: 'Un puñado (~30 g): nueces, almendras, pistachos, avellanas', target: 5, enabled: true },
  { id: 'legumbre', label: 'Legumbre', hint: '½: garbanzos en ensalada o sopa, hummus · 1: plato de lentejas, cocido…', portions: true, target: 2, enabled: true },
  { id: 'danacol', label: 'Danacol (esteroles)', hint: 'Un bote al día', target: 6, enabled: true },
  { id: 'pescado', label: 'Pescado azul', hint: 'Salmón, sardinas, caballa, boquerón…', target: 2, enabled: false },
];

// Datos nutricionales de los productos que tomo. "source" indica de dónde sale cada
// valor de beta-glucanos: 'etiqueta' o 'estimado' (la etiqueta no lo declara).
export const FOODS = {
  avenaAlea: {
    name: 'Copos de avena Alea manzana y canela', note: 'Los de la mañana y la noche · avena 87 %',
    unit: 'g', betaPerG: 0.035, source: 'estimado', per100: { kcal: 357, sat: 0.9 },
  },
  galletaSalvado: {
    name: 'Galleta Santiveri avena con salvado', note: 'La nueva · desayuno o merienda',
    unit: 'galleta', gramsPerUnit: 11, perUnit: { beta: 0.3, kcal: 53, sat: 0.2 }, source: 'etiqueta',
  },
  galletaSinGluten: {
    name: 'Galleta Santiveri avena sin gluten', note: 'La antigua, 21 % avena',
    // Peso por galleta: el de SPEC.md, pendiente de pesar.
    unit: 'galleta', gramsPerUnit: 12, gramsEstimated: true,
    betaPerG: 0.009, source: 'estimado', per100: { kcal: 427, sat: 1.4 },
  },
};

// Casillas con cantidad (nº de unidades al día). Solo registro: no tienen objetivo
// y no cuentan para el % de cumplimiento.
export const COUNTERS = [
  { id: 'galletaSalvado', food: 'galletaSalvado', short: 'Galleta avena con salvado' },
  { id: 'galletaSinGluten', food: 'galletaSinGluten', short: 'Galleta avena sin gluten' },
];
export const MAX_COUNT = 20;

/** Aporte de n unidades de un producto: beta-glucanos (g), energía (kcal) y saturadas (g). */
export function foodTotals(food, n) {
  if (food.perUnit) return { beta: food.perUnit.beta * n, kcal: food.perUnit.kcal * n, sat: food.perUnit.sat * n };
  const g = n * (food.gramsPerUnit || 1);
  return { beta: food.betaPerG * g, kcal: (food.per100.kcal * g) / 100, sat: (food.per100.sat * g) / 100 };
}

export const EXERCISE_TYPES = ['Caminar', 'Correr', 'Bici', 'Nadar', 'Fuerza', 'Otro'];

export const DEFAULT_GOALS = {
  aerobicMin: 90,  // minutos por semana (todo lo que no sea fuerza)
  strengthMin: 1,  // sesiones de fuerza por semana
};

export function defaultSettings() {
  return {
    goals: { ...DEFAULT_GOALS },
    checks: Object.fromEntries(CHECKS.map((c) => [c.id, { enabled: c.enabled, target: c.target }])),
    usual: ['avenaDesayuno', 'avenaCena', 'frutosSecos', 'danacol'], // botón "Lo de siempre"
    lastBackupAt: null,
  };
}

export function emptyDay() {
  return { checks: {}, counts: {}, exercise: [], notes: '', updatedAt: null };
}

/** Valor de una casilla en un día: 0 si no está marcada; en las de raciones, 0.5 o 1; en el resto, 1. */
export function checkValue(day, c) {
  const v = day && day.checks ? day.checks[c.id] : undefined;
  if (!v) return 0;
  if (!c.portions || v === true) return 1;
  return Math.min(1, Math.max(0, Number(v) || 0));
}

/** Unidad del objetivo semanal de una casilla: [plural, singular]. */
export const checkUnits = (c) => (c.portions ? ['raciones', 'ración'] : ['días', 'día']);

/** Casillas activas con su objetivo semanal según los ajustes. */
export function activeChecks(settings) {
  const s = (settings && settings.checks) || {};
  return CHECKS.map((c) => ({ ...c, ...(s[c.id] || {}) })).filter((c) => c.enabled);
}
