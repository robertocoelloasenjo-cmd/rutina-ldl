// Valores iniciales: objetivos, catálogo de alimentos y plantillas.
// Todos los factores nutricionales son ESTIMACIONES y se podrán editar en Ajustes.
//
// Cómo se interpreta un alimento:
//   - Cada apunte guarda "qty" en la unidad base del alimento (food.unit).
//   - gramos = qty × gramsPerUnit
//   - contributes.betaGlucanPerG  → g de beta-glucanos por cada gramo
//   - contributes.nutsPerG        → g de frutos secos por cada gramo (1 = todo cuenta)
//   - contributes.sterolsPerUnit  → g de esteroles por unidad
//   - contributes.fruitVegPerUnit → raciones de fruta/verdura por unidad
//   - contributes.legumePerUnit, oilyFishPerUnit, redMeatPerUnit, cheesePerUnit → contadores
//   - altUnit: unidad alternativa para escribir (p. ej. "cucharada" = 8 g) en alimentos en gramos.
//   - quick: cantidades rápidas, en unidad base.

export const SCHEMA_VERSION = 1;

export const MEALS = [
  { id: 'desayuno', name: 'Desayuno' },
  { id: 'comida', name: 'Comida' },
  { id: 'merienda', name: 'Merienda' },
  { id: 'cena', name: 'Cena' },
];

export const DEFAULT_GOALS = {
  betaGlucanG: 3,
  nutsG: 30,
  sterolsG: 1.6,
  fruitVegServings: 5,
  legumeDaysMin: 3,
  oilyFishMin: 2,
  redMeatMax: 1,
  cheeseMax: 2,
  aerobicMin: 150,
  strengthMin: 2,
};

export const CATEGORIES = {
  cereal: 'Cereales y avena',
  frutos: 'Frutos secos',
  esteroles: 'Esteroles',
  legumbre: 'Legumbres',
  proteina: 'Pescado, carne y queso',
  frutaverdura: 'Fruta y verdura',
  lacteo: 'Lácteos y bebidas',
  otros: 'Otros',
};

export const DEFAULT_FOODS = [
  { id: 'avena-alea', name: 'Copos de avena Alea manzana y canela', unit: 'g', gramsPerUnit: 1,
    category: 'cereal', meals: ['desayuno', 'cena'], quick: [10, 17, 25, 40],
    contributes: { betaGlucanPerG: 0.037 } },
  { id: 'avena-natural', name: 'Copos de avena natural', unit: 'g', gramsPerUnit: 1,
    category: 'cereal', meals: ['desayuno', 'cena'], quick: [20, 30, 40, 60],
    contributes: { betaGlucanPerG: 0.04 } },
  { id: 'salvado-avena', name: 'Salvado de avena', unit: 'g', gramsPerUnit: 1,
    altUnit: { name: 'cucharada', plural: 'cucharadas', grams: 8 },
    category: 'cereal', meals: ['desayuno', 'cena'], quick: [8, 16, 24, 32],
    contributes: { betaGlucanPerG: 0.07 } },
  { id: 'galleta-santiveri', name: 'Galleta de avena Santiveri', unit: 'unidad', gramsPerUnit: 12,
    category: 'cereal', meals: ['desayuno', 'merienda'], quick: [1, 2, 3, 4],
    contributes: { betaGlucanPerG: 0.009 } },
  { id: 'yogur-desnatado', name: 'Yogur desnatado', unit: 'unidad', gramsPerUnit: 125,
    category: 'lacteo', meals: ['desayuno', 'merienda', 'cena'], quick: [1, 2],
    contributes: {} },
  { id: 'yogur-natural', name: 'Yogur natural', unit: 'unidad', gramsPerUnit: 125,
    category: 'lacteo', meals: ['cena', 'merienda'], quick: [1, 2],
    contributes: {} },
  { id: 'nueces', name: 'Nueces', unit: 'g', gramsPerUnit: 1,
    altUnit: { name: 'nuez', plural: 'nueces', grams: 4.5 },
    category: 'frutos', meals: ['cena', 'merienda', 'desayuno'], quick: [9, 15, 20, 30],
    contributes: { nutsPerG: 1 } },
  { id: 'almendras', name: 'Almendras', unit: 'g', gramsPerUnit: 1,
    altUnit: { name: 'almendra', plural: 'almendras', grams: 1.2 },
    category: 'frutos', meals: ['merienda', 'desayuno'], quick: [6, 12, 18, 30],
    contributes: { nutsPerG: 1 } },
  { id: 'pistachos', name: 'Pistachos', unit: 'g', gramsPerUnit: 1,
    category: 'frutos', meals: ['merienda'], quick: [10, 15, 20, 30],
    contributes: { nutsPerG: 1 } },
  { id: 'danacol', name: 'Danacol', unit: 'botellita', gramsPerUnit: 100,
    category: 'esteroles', meals: ['cena', 'desayuno'], quick: [1],
    contributes: { sterolsPerUnit: 1.6 } },
  { id: 'legumbre-plato', name: 'Legumbre en plato (150 g cocida)', unit: 'ración', gramsPerUnit: 150,
    category: 'legumbre', meals: ['comida', 'cena'], quick: [0.5, 1, 1.5],
    contributes: { legumePerUnit: 1 } },
  { id: 'legumbre-ensalada', name: 'Legumbre en ensalada (4-5 cucharadas)', unit: 'ración', gramsPerUnit: 90,
    category: 'legumbre', meals: ['comida', 'cena'], quick: [1, 2],
    contributes: { legumePerUnit: 0.5 } },
  { id: 'pescado-azul', name: 'Pescado azul', unit: 'ración', gramsPerUnit: 150,
    category: 'proteina', meals: ['comida', 'cena'], quick: [1],
    contributes: { oilyFishPerUnit: 1 } },
  { id: 'pescado-blanco', name: 'Pescado blanco', unit: 'ración', gramsPerUnit: 150,
    category: 'proteina', meals: ['comida', 'cena'], quick: [1],
    contributes: {} },
  { id: 'carne-roja', name: 'Carne roja', unit: 'ración', gramsPerUnit: 120,
    category: 'proteina', meals: ['comida', 'cena'], quick: [1],
    contributes: { redMeatPerUnit: 1 } },
  { id: 'ave', name: 'Ave sin piel', unit: 'ración', gramsPerUnit: 150,
    category: 'proteina', meals: ['comida', 'cena'], quick: [1],
    contributes: {} },
  { id: 'queso', name: 'Queso', unit: 'ración', gramsPerUnit: 30,
    category: 'proteina', meals: ['comida', 'cena', 'merienda'], quick: [1],
    contributes: { cheesePerUnit: 1 } },
  { id: 'fruta', name: 'Fruta', unit: 'pieza', gramsPerUnit: 150,
    category: 'frutaverdura', meals: ['desayuno', 'comida', 'merienda', 'cena'], quick: [1, 2],
    contributes: { fruitVegPerUnit: 1 } },
  { id: 'verdura', name: 'Verdura o ensalada', unit: 'ración', gramsPerUnit: 150,
    category: 'frutaverdura', meals: ['comida', 'cena'], quick: [1, 2],
    contributes: { fruitVegPerUnit: 1 } },
  { id: 'arandanos', name: 'Arándanos', unit: 'ración', gramsPerUnit: 80,
    category: 'frutaverdura', meals: ['cena', 'desayuno', 'merienda'], quick: [1],
    contributes: { fruitVegPerUnit: 1 } },
  { id: 'pan-integral', name: 'Pan integral', unit: 'rebanada', gramsPerUnit: 30,
    category: 'otros', meals: ['desayuno', 'comida', 'cena'], quick: [1, 2],
    contributes: {} },
  { id: 'cafe-leche', name: 'Café con leche desnatada', unit: 'unidad', gramsPerUnit: 200,
    category: 'lacteo', meals: ['desayuno', 'merienda'], quick: [1, 2],
    contributes: {} },
];

export const DEFAULT_TEMPLATES = [
  { id: 'desayuno-habitual', meal: 'desayuno', name: 'Mi desayuno habitual', items: [
    { foodId: 'cafe-leche', qty: 1 },
    { foodId: 'yogur-desnatado', qty: 1 },
    { foodId: 'avena-alea', qty: 17 },
    { foodId: 'galleta-santiveri', qty: 2 },
  ] },
  { id: 'cena-habitual', meal: 'cena', name: 'Mi cena habitual', items: [
    { foodId: 'yogur-natural', qty: 1 },
    { foodId: 'arandanos', qty: 1 },
    { foodId: 'avena-alea', qty: 17 },
    { foodId: 'salvado-avena', qty: 16 },
    { foodId: 'nueces', qty: 30 },
    { foodId: 'danacol', qty: 1 },
  ] },
];

export function defaultSettings() {
  return { goals: { ...DEFAULT_GOALS }, lastBackupAt: null };
}

export function emptyDay() {
  return {
    meals: { desayuno: [], comida: [], merienda: [], cena: [] },
    aerobicMin: 0,
    strength: false,
    notes: '',
    updatedAt: null,
  };
}
