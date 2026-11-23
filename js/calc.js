// Cálculos: totales de un día, aporte de cada apunte y sugerencias.
// Nada de esto se guarda; se recalcula siempre con los factores actuales.

import { MEALS } from './defaults.js';

export const nf = (n, dec = 1) => Number(n || 0).toLocaleString('es-ES', {
  minimumFractionDigits: 0, maximumFractionDigits: dec,
});

/** Aporte de un apunte { foodId, qty }. */
export function itemContribution(food, qty) {
  const c = (food && food.contributes) || {};
  const grams = qty * (Number(food && food.gramsPerUnit) || 1);
  return {
    betaGlucanG: grams * (Number(c.betaGlucanPerG) || 0),
    nutsG: grams * (Number(c.nutsPerG) || 0),
    sterolsG: qty * (Number(c.sterolsPerUnit) || 0),
    fruitVeg: qty * (Number(c.fruitVegPerUnit) || 0),
    legume: qty * (Number(c.legumePerUnit) || 0),
    oilyFish: qty * (Number(c.oilyFishPerUnit) || 0),
    redMeat: qty * (Number(c.redMeatPerUnit) || 0),
    cheese: qty * (Number(c.cheesePerUnit) || 0),
  };
}

export function dayTotals(day, foodsById) {
  const t = { betaGlucanG: 0, nutsG: 0, sterolsG: 0, fruitVeg: 0, legume: 0, oilyFish: 0, redMeat: 0, cheese: 0 };
  for (const m of MEALS) {
    for (const it of (day.meals[m.id] || [])) {
      const food = foodsById[it.foodId];
      if (!food) continue;
      const c = itemContribution(food, Number(it.qty) || 0);
      for (const k of Object.keys(t)) t[k] += c[k];
    }
  }
  return t;
}

/** Texto corto con lo que aporta un apunte ("0,63 g beta-glucanos"). */
export function contributionText(c) {
  const parts = [];
  if (c.betaGlucanG > 0) parts.push(`${nf(c.betaGlucanG, 2)} g beta-glucanos`);
  if (c.nutsG > 0) parts.push(`${nf(c.nutsG, 0)} g frutos secos`);
  if (c.sterolsG > 0) parts.push(`${nf(c.sterolsG, 1)} g esteroles`);
  if (c.fruitVeg > 0) parts.push(`${nf(c.fruitVeg)} ${c.fruitVeg === 1 ? 'ración' : 'raciones'} fruta/verdura`);
  if (c.legume > 0) parts.push(`${nf(c.legume)} ${c.legume === 1 ? 'ración' : 'raciones'} legumbre`);
  if (c.oilyFish > 0) parts.push('pescado azul');
  if (c.redMeat > 0) parts.push('carne roja');
  if (c.cheese > 0) parts.push('queso');
  return parts.join(' · ');
}

/** "17 g", "2 cucharadas (16 g)", "2 unidades", "1 ración". */
export function qtyText(food, qty) {
  const u = food.unit;
  if (u === 'g') {
    if (food.altUnit && food.altUnit.grams > 0) {
      const n = qty / food.altUnit.grams;
      if (Math.abs(n - Math.round(n)) < 0.05 && Math.round(n) >= 1) {
        const r = Math.round(n);
        return `${nf(qty, 1)} g (${r} ${r === 1 ? food.altUnit.name : food.altUnit.plural})`;
      }
    }
    return `${nf(qty, 1)} g`;
  }
  return `${nf(qty, 2)} ${pluralUnit(u, qty)}`;
}

export function pluralUnit(u, qty) {
  if (qty === 1) return u;
  const map = { 'ración': 'raciones', unidad: 'unidades', botellita: 'botellitas', pieza: 'piezas', rebanada: 'rebanadas', cucharada: 'cucharadas' };
  return map[u] || u;
}

/** Siguiente comida según la hora, para redactar la sugerencia. */
function whenText(isToday) {
  if (!isToday) return '';
  const h = new Date().getHours();
  if (h < 11) return ' a lo largo del día';
  if (h < 16) return ' en la merienda o la cena';
  if (h < 23) return ' esta noche';
  return '';
}

/** Expresa unos gramos de un alimento de forma práctica ("3 cucharadas de salvado (24 g)"). */
function amountOf(food, grams) {
  const short = food.shortName || food.name.split('(')[0].trim().toLowerCase();
  if (food.unit === 'g') {
    if (food.altUnit && food.altUnit.grams > 0) {
      const n = Math.max(1, Math.ceil(grams / food.altUnit.grams - 0.15));
      const g = n * food.altUnit.grams;
      if (food.altUnit.name === 'cucharada') {
        return `${n} ${n === 1 ? 'cucharada' : 'cucharadas'} de ${short} (${nf(g, 0)} g)`;
      }
      return `${n} ${n === 1 ? food.altUnit.name : food.altUnit.plural} (${nf(g, 0)} g)`;
    }
    return `${nf(Math.ceil(grams), 0)} g de ${short}`;
  }
  const units = Math.max(1, Math.ceil(grams / (Number(food.gramsPerUnit) || 1)));
  return `${units} ${pluralUnit(food.unit, units)} de ${short}`;
}

/** Devuelve las sugerencias por indicador: { betaGlucanG: 'Te faltan…', … }. */
export function suggestions(totals, goals, foods, isToday) {
  const out = {};
  const when = whenText(isToday);

  const bgMissing = goals.betaGlucanG - totals.betaGlucanG;
  if (bgMissing > 0.005) {
    const best = foods.filter((f) => (f.contributes || {}).betaGlucanPerG > 0.02)
      .sort((a, b) => b.contributes.betaGlucanPerG - a.contributes.betaGlucanPerG).slice(0, 2);
    const opts = best.map((f) => amountOf(f, bgMissing / f.contributes.betaGlucanPerG));
    out.betaGlucanG = `Te faltan ${nf(bgMissing, 1)} g de beta-glucanos${opts.length ? ': por ejemplo ' + opts.join(' o ') : ''}${when}.`;
  }

  const nutsMissing = goals.nutsG - totals.nutsG;
  if (nutsMissing > 0.5) {
    const opts = foods.filter((f) => (f.contributes || {}).nutsPerG > 0 && f.altUnit)
      .slice(0, 2).map((f) => amountOf(f, nutsMissing / f.contributes.nutsPerG));
    out.nutsG = `Te faltan ${nf(nutsMissing, 0)} g de frutos secos${opts.length ? ': por ejemplo ' + opts.join(' o ') : ''}${when}.`;
  }

  const stMissing = goals.sterolsG - totals.sterolsG;
  if (stMissing > 0.01) {
    const f = foods.find((x) => (x.contributes || {}).sterolsPerUnit > 0);
    let txt = `Te faltan ${nf(stMissing, 1)} g de esteroles`;
    if (f) {
      const n = Math.ceil(stMissing / f.contributes.sterolsPerUnit - 0.01);
      txt += `: ${n} ${pluralUnit(f.unit, n)} de ${f.name} (${nf(f.contributes.sterolsPerUnit, 1)} g cada una)`;
    }
    out.sterolsG = txt + when + '.';
  }

  const fvMissing = goals.fruitVegServings - totals.fruitVeg;
  if (fvMissing > 0.05) {
    const n = Math.ceil(fvMissing - 0.05);
    const veg = Math.ceil(n / 2), fruit = n - veg;
    const ex = n === 1 ? 'una pieza de fruta'
      : `${veg} ${veg === 1 ? 'ración' : 'raciones'} de verdura o ensalada y ${fruit} ${fruit === 1 ? 'pieza' : 'piezas'} de fruta`;
    out.fruitVegServings = `Te ${n === 1 ? 'falta' : 'faltan'} ${n} ${n === 1 ? 'ración' : 'raciones'} de fruta o verdura: por ejemplo ${ex}${when}.`;
  }
  return out;
}

export const DAILY_INDICATORS = [
  { key: 'betaGlucanG', total: 'betaGlucanG', label: 'Beta-glucanos', unit: 'g', dec: 2 },
  { key: 'nutsG', total: 'nutsG', label: 'Frutos secos', unit: 'g', dec: 0 },
  { key: 'sterolsG', total: 'sterolsG', label: 'Esteroles vegetales', unit: 'g', dec: 1 },
  { key: 'fruitVegServings', total: 'fruitVeg', label: 'Fruta o verdura', unit: 'raciones', dec: 1 },
];
