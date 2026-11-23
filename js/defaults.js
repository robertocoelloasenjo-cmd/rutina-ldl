// Valores iniciales. Versión simplificada (esquema 2):
// cada día solo se marcan casillas de alimentos MUY positivos para el LDL,
// más el ejercicio (tipo y minutos) y una nota libre.

export const SCHEMA_VERSION = 3;

// Casillas diarias. "target" = días por semana que se buscan.
// Base: Portfolio Diet (fibra viscosa, frutos secos, proteína vegetal, esteroles,
// grasa monoinsaturada) y declaraciones de salud de la EFSA.
export const CHECKS = [
  { id: 'avenaDesayuno', label: 'Avena en el desayuno', hint: 'Copos o salvado de avena (beta-glucanos)', group: 'avena', target: 6, enabled: true },
  { id: 'avenaCena', label: 'Avena en la cena', hint: 'Copos o salvado de avena (beta-glucanos)', group: 'avena', target: 6, enabled: true },
  { id: 'frutosSecos', label: 'Frutos secos', hint: 'Un puñado (~30 g): nueces, almendras, pistachos, avellanas', target: 5, enabled: true },
  { id: 'legumbre', label: 'Legumbre', hint: 'Lentejas, garbanzos, alubias, soja, edamame, hummus', target: 2, enabled: true },
  { id: 'danacol', label: 'Danacol (esteroles)', hint: 'Un bote al día', target: 6, enabled: true },
  { id: 'pescado', label: 'Pescado azul', hint: 'Salmón, sardinas, caballa, boquerón…', target: 2, enabled: false },
];

export const EXERCISE_TYPES = ['Caminar', 'Correr', 'Bici', 'Nadar', 'Fuerza', 'Otro'];

export const DEFAULT_GOALS = {
  aerobicMin: 90,  // minutos por semana (todo lo que no sea fuerza)
  strengthMin: 1,  // sesiones de fuerza por semana
};

export function defaultSettings() {
  return {
    goals: { ...DEFAULT_GOALS },
    checks: Object.fromEntries(CHECKS.map((c) => [c.id, { enabled: c.enabled, target: c.target }])),
    lastBackupAt: null,
  };
}

export function emptyDay() {
  return { checks: {}, exercise: [], notes: '', updatedAt: null };
}

/** Casillas activas con su objetivo semanal según los ajustes. */
export function activeChecks(settings) {
  const s = (settings && settings.checks) || {};
  return CHECKS.map((c) => ({ ...c, ...(s[c.id] || {}) })).filter((c) => c.enabled);
}
