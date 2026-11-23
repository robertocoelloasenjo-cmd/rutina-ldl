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
//   - ldlScore: efecto orientativo sobre el LDL, de -2 a +2 (ver LDL_SCORES).
//   - ldlNote: por qué tiene esa valoración, en pocas palabras.
//   - custom: true → "Otro alimento": al apuntarlo se escribe el nombre y se elige la valoración.

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

export const LDL_SCORES = {
  2: { label: 'Muy favorable', short: '++', cls: 's2' },
  1: { label: 'Favorable', short: '+', cls: 's1' },
  0: { label: 'Neutro', short: '=', cls: 's0' },
  '-1': { label: 'Desfavorable', short: '−', cls: 'sm1' },
  '-2': { label: 'Muy desfavorable', short: '−−', cls: 'sm2' },
};

export const CATEGORIES = {
  otro: 'Algo que no está en la lista',
  cereal: 'Cereales, pan y avena',
  frutos: 'Frutos secos y semillas',
  esteroles: 'Esteroles',
  legumbre: 'Legumbres y soja',
  proteina: 'Pescado, carne, huevo y queso',
  frutaverdura: 'Fruta y verdura',
  grasas: 'Aceites y grasas',
  lacteo: 'Lácteos y bebidas',
  caprichos: 'Comida rápida, bollería y caprichos',
  otros: 'Otros',
};

const F = (id, name, unit, gramsPerUnit, category, meals, quick, contributes, ldlScore, ldlNote, extra = {}) =>
  ({ id, name, unit, gramsPerUnit, category, meals, quick, contributes, ldlScore, ldlNote, ...extra });

const ALL = ['desayuno', 'comida', 'merienda', 'cena'];
const MAIN = ['comida', 'cena'];

export const DEFAULT_FOODS = [
  F('otro', 'Otro alimento (escribir)', 'ración', 100, 'otro', ALL, [1], {}, 0,
    'Escribe qué has comido y elige si es favorable o no.', { custom: true }),

  // Cereales y avena
  F('avena-alea', 'Copos de avena Alea manzana y canela', 'g', 1, 'cereal', ['desayuno', 'cena'], [10, 17, 25, 40],
    { betaGlucanPerG: 0.037 }, 2, 'Beta-glucanos (fibra soluble) que bajan el LDL'),
  F('avena-natural', 'Copos de avena natural', 'g', 1, 'cereal', ['desayuno', 'cena'], [20, 30, 40, 60],
    { betaGlucanPerG: 0.04 }, 2, 'Beta-glucanos (fibra soluble) que bajan el LDL'),
  F('salvado-avena', 'Salvado de avena', 'g', 1, 'cereal', ['desayuno', 'cena'], [8, 16, 24, 32],
    { betaGlucanPerG: 0.07 }, 2, 'La fuente más concentrada de beta-glucanos',
    { altUnit: { name: 'cucharada', plural: 'cucharadas', grams: 8 } }),
  F('galleta-santiveri', 'Galleta de avena Santiveri', 'unidad', 12, 'cereal', ['desayuno', 'merienda'], [1, 2, 3, 4],
    { betaGlucanPerG: 0.009 }, 0, 'Algo de avena, pero sigue siendo galleta'),
  F('pan-integral', 'Pan integral', 'rebanada', 30, 'cereal', ['desayuno', 'comida', 'cena'], [1, 2],
    {}, 1, 'Fibra; mejor que el pan blanco'),
  F('pan-blanco', 'Pan blanco', 'rebanada', 30, 'cereal', ['desayuno', 'comida', 'cena'], [1, 2],
    {}, 0, 'Harina refinada, poca fibra'),
  F('arroz-pasta-integral', 'Arroz o pasta integral', 'ración', 70, 'cereal', MAIN, [1],
    {}, 1, 'Fibra; mejor que la versión blanca'),
  F('arroz-pasta-blanca', 'Arroz o pasta blanca', 'ración', 70, 'cereal', MAIN, [1],
    {}, 0, 'Neutro para el LDL; depende de la salsa'),
  F('patata', 'Patata cocida o al horno', 'ración', 200, 'cereal', MAIN, [1],
    {}, 0, 'Neutra si no es frita'),

  // Frutos secos y semillas
  F('nueces', 'Nueces', 'g', 1, 'frutos', ['cena', 'merienda', 'desayuno'], [9, 15, 20, 30],
    { nutsPerG: 1 }, 2, 'Grasas insaturadas y omega-3 vegetal',
    { altUnit: { name: 'nuez', plural: 'nueces', grams: 4.5 } }),
  F('almendras', 'Almendras', 'g', 1, 'frutos', ['merienda', 'desayuno'], [6, 12, 18, 30],
    { nutsPerG: 1 }, 2, 'Grasas insaturadas y fibra',
    { altUnit: { name: 'almendra', plural: 'almendras', grams: 1.2 } }),
  F('pistachos', 'Pistachos', 'g', 1, 'frutos', ['merienda'], [10, 15, 20, 30],
    { nutsPerG: 1 }, 2, 'Grasas insaturadas y fitoesteroles'),
  F('semillas-lino', 'Semillas de lino molidas', 'g', 1, 'frutos', ['desayuno', 'cena'], [5, 10, 15],
    {}, 1, 'Fibra soluble y omega-3 vegetal',
    { altUnit: { name: 'cucharada', plural: 'cucharadas', grams: 10 } }),

  // Esteroles
  F('danacol', 'Danacol', 'botellita', 100, 'esteroles', ['cena', 'desayuno'], [1],
    { sterolsPerUnit: 1.6 }, 2, 'Esteroles vegetales: reducen la absorción de colesterol'),

  // Legumbres y soja
  F('legumbre-plato', 'Legumbre en plato (150 g cocida)', 'ración', 150, 'legumbre', MAIN, [0.5, 1, 1.5],
    { legumePerUnit: 1 }, 2, 'Fibra soluble y proteína vegetal'),
  F('legumbre-ensalada', 'Legumbre en ensalada (4-5 cucharadas)', 'ración', 90, 'legumbre', MAIN, [1, 2],
    { legumePerUnit: 0.5 }, 2, 'Fibra soluble y proteína vegetal'),
  F('hummus', 'Hummus', 'cucharada', 15, 'legumbre', ['comida', 'merienda', 'cena'], [2, 4],
    {}, 1, 'Garbanzo y aceite; no cuenta como ración de legumbre'),
  F('tofu-soja', 'Tofu, tempeh o soja texturizada', 'ración', 100, 'legumbre', MAIN, [1],
    {}, 1, 'Proteína de soja en lugar de carne'),
  F('bebida-soja', 'Bebida de soja', 'vaso', 200, 'legumbre', ['desayuno', 'merienda'], [1],
    {}, 1, 'Proteína de soja; elegir sin azúcar'),

  // Pescado, carne, huevo y queso
  F('pescado-azul', 'Pescado azul', 'ración', 150, 'proteina', MAIN, [1],
    { oilyFishPerUnit: 1 }, 1, 'Omega-3; sustituye a la carne'),
  F('pescado-blanco', 'Pescado blanco', 'ración', 150, 'proteina', MAIN, [1],
    {}, 1, 'Proteína magra; sustituye a la carne'),
  F('ave', 'Ave sin piel', 'ración', 150, 'proteina', MAIN, [1],
    {}, 0, 'Proteína magra, neutra'),
  F('huevo', 'Huevo', 'unidad', 60, 'proteina', ['desayuno', 'comida', 'cena'], [1, 2],
    {}, 0, 'Neutro con moderación (hasta 1 al día)'),
  F('carne-roja', 'Carne roja', 'ración', 120, 'proteina', MAIN, [1],
    { redMeatPerUnit: 1 }, -1, 'Grasa saturada'),
  F('jamon-serrano', 'Jamón serrano o lomo embuchado', 'ración', 40, 'proteina', ['desayuno', 'comida', 'merienda', 'cena'], [1],
    {}, -1, 'Grasa saturada y sal; mejor quitando la grasa visible'),
  F('fiambre-pavo', 'Fiambre de pavo o pollo', 'ración', 40, 'proteina', ['desayuno', 'merienda'], [1],
    {}, 0, 'Poca grasa; ojo con la sal'),
  F('embutido-graso', 'Embutido graso (chorizo, salchichón, salami)', 'ración', 40, 'proteina', ALL, [1],
    {}, -2, 'Mucha grasa saturada'),
  F('queso', 'Queso', 'ración', 30, 'proteina', ['comida', 'cena', 'merienda'], [1],
    { cheesePerUnit: 1 }, -1, 'Grasa saturada (el fresco desnatado, menos)'),

  // Fruta y verdura
  F('fruta', 'Fruta', 'pieza', 150, 'frutaverdura', ALL, [1, 2],
    { fruitVegPerUnit: 1 }, 1, 'Fibra soluble (pectina) y antioxidantes'),
  F('verdura', 'Verdura o ensalada', 'ración', 150, 'frutaverdura', MAIN, [1, 2],
    { fruitVegPerUnit: 1 }, 1, 'Fibra; desplaza alimentos menos sanos'),
  F('arandanos', 'Arándanos', 'ración', 80, 'frutaverdura', ['cena', 'desayuno', 'merienda'], [1],
    { fruitVegPerUnit: 1 }, 1, 'Fibra y antioxidantes'),
  F('aguacate', 'Aguacate', 'medio', 70, 'frutaverdura', ['desayuno', 'comida', 'cena'], [1],
    {}, 1, 'Grasa insaturada y fibra'),

  // Aceites y grasas
  F('aove', 'Aceite de oliva virgen extra', 'cucharada', 10, 'grasas', ALL, [1, 2],
    {}, 1, 'Grasa insaturada; la grasa de elección'),
  F('mantequilla', 'Mantequilla', 'ración', 10, 'grasas', ['desayuno', 'merienda'], [1],
    {}, -2, 'Mucha grasa saturada'),
  F('nata', 'Nata o salsa con nata', 'ración', 50, 'grasas', MAIN, [1],
    {}, -2, 'Mucha grasa saturada'),

  // Lácteos y bebidas
  F('yogur-desnatado', 'Yogur desnatado', 'unidad', 125, 'lacteo', ['desayuno', 'merienda', 'cena'], [1, 2],
    {}, 0, 'Neutro'),
  F('yogur-natural', 'Yogur natural', 'unidad', 125, 'lacteo', ['cena', 'merienda'], [1, 2],
    {}, 0, 'Neutro (el entero tiene algo de grasa saturada)'),
  F('cafe-leche', 'Café con leche desnatada', 'unidad', 200, 'lacteo', ['desayuno', 'merienda'], [1, 2],
    {}, 0, 'Neutro'),
  F('leche-entera', 'Leche entera', 'vaso', 200, 'lacteo', ['desayuno', 'merienda'], [1],
    {}, -1, 'Grasa saturada; mejor desnatada'),
  F('alcohol', 'Cerveza o vino', 'copa', 150, 'lacteo', ['comida', 'cena'], [1, 2],
    {}, 0, 'No baja el LDL; mejor poco o nada'),

  // Comida rápida, bollería y caprichos
  F('empanada', 'Empanada o empanadilla', 'ración', 150, 'caprichos', ALL, [1],
    {}, -1, 'Masa con grasa y a menudo relleno graso'),
  F('pizza', 'Pizza', 'ración', 200, 'caprichos', MAIN, [1, 2],
    {}, -1, 'Queso y masa refinada'),
  F('hamburguesa', 'Hamburguesa de comida rápida', 'unidad', 250, 'caprichos', MAIN, [1],
    {}, -2, 'Carne grasa, queso y salsas'),
  F('fritos', 'Fritos o rebozados', 'ración', 150, 'caprichos', MAIN, [1],
    {}, -1, 'Grasa añadida; peor si el aceite no es de oliva'),
  F('bolleria', 'Bollería (croissant, magdalena, donut)', 'unidad', 60, 'caprichos', ['desayuno', 'merienda'], [1, 2],
    {}, -2, 'Grasa saturada o trans y azúcar'),
  F('galletas', 'Galletas normales', 'unidad', 10, 'caprichos', ['desayuno', 'merienda'], [2, 4],
    {}, -1, 'Grasas de palma o mantequilla y azúcar'),
  F('snacks', 'Patatas fritas de bolsa o snacks', 'bolsa', 40, 'caprichos', ['comida', 'merienda', 'cena'], [1],
    {}, -1, 'Frito y salado'),
  F('postre-dulce', 'Postre dulce o helado', 'ración', 100, 'caprichos', MAIN, [1],
    {}, -1, 'Grasa saturada y azúcar'),
  F('chocolate-negro', 'Chocolate negro (más del 70 %)', 'onza', 10, 'caprichos', ['merienda', 'desayuno'], [1, 2],
    {}, 0, 'Neutro en poca cantidad'),
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
