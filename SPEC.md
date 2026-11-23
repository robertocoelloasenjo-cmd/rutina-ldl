# Rutina LDL — especificación

App personal para iPhone que registra lo que como en cada comida y calcula, en tiempo real, cómo voy frente a mis objetivos diarios y semanales para bajar el LDL. No es solo un checklist: cada alimento que apunto suma a nutrientes y contadores, y la app me dice qué me falta y cuánto de qué alimento tomar para completarlo.

Este documento es el punto de partida para Claude Code. Léelo entero antes de escribir código y guárdalo en el repositorio como SPEC.md.

## 1. Contexto

- Usuario único (yo), uso diario desde el iPhone, en español.
- LDL 223 → 180 mg/dL tras los primeros cambios. Próxima analítica en marzo-abril.
- Objetivo de la app: mantener el plan con constancia y llegar a la consulta con datos de cumplimiento.
- Lo usaré sobre todo en tres momentos: después del desayuno, en la comida del trabajo y antes de cenar ("¿qué me falta hoy?").

## 2. Restricciones técnicas

- Web estática en GitHub Pages. Sin servidor, sin base de datos externa, sin cuentas ni login.
- Sin dependencias de Claude ni de servicios de terceros en tiempo de ejecución.
- Instalable en iPhone desde Safari con "Añadir a pantalla de inicio" (PWA): manifest.webmanifest, iconos, apple-mobile-web-app-capable, theme-color.
- Funciona sin conexión gracias a un service worker que cachea la app. Al publicar una versión nueva, la app se actualiza sola en la siguiente apertura.
- Datos solo en el dispositivo: IndexedDB (preferible) o localStorage, detrás de una capa de almacenamiento aislada (un único módulo storage.js con loadAll, getDay, saveDay, getSettings, saveSettings, exportAll, importAll). Así se puede cambiar a otro sistema (por ejemplo, sincronizar con un repositorio privado) sin tocar el resto.
- Pedir navigator.storage.persist() al arrancar para reducir el riesgo de que iOS borre los datos.
- Stack sencillo: HTML, CSS y JavaScript sin framework, o un framework ligero si compensa. Sin paso de build obligatorio, o con uno simple (Vite) que genere dist/ y una GitHub Action que publique en Pages. Claude Code decide y lo justifica en el README.
- Diseño mobile first (ancho 375-430 px), botones grandes, modo claro y oscuro automáticos, respetar las zonas seguras del iPhone (notch y barra inferior).

## 3. Estructura funcional

### 3.1 Pantalla "Hoy" (principal)

Arriba, el panel del día: barras de progreso con consumido, objetivo y pendiente.

| Indicador | Objetivo diario | Cómo se calcula |
|---|---|---|
| Beta-glucanos | 3 g | Suma de (gramos de cada alimento × factor de beta-glucanos) |
| Frutos secos | 30 g | Suma de gramos de nueces, almendras y pistachos |
| Esteroles vegetales | 2 g | Danacol × 1,6 g por botellita |
| Fruta o verdura | 5 raciones | Suma de raciones |

Debajo de cada indicador con pendiente, una sugerencia concreta para completarlo: "Te faltan 1,7 g de beta-glucanos: unas 3 cucharadas de salvado (24 g) o 45 g de avena esta noche". Las equivalencias se calculan con los factores de la tabla de alimentos.

Debajo, las cuatro comidas: Desayuno, Comida, Merienda y Cena. Cada una:

- Muestra los alimentos apuntados con su cantidad y lo que aportan.
- Tiene un botón "Añadir" que abre el catálogo de alimentos, con cantidades rápidas (botones de cantidad típica más un campo editable).
- Permite editar o borrar cada alimento apuntado.
- Desayuno y Cena tienen un botón "Mi desayuno habitual" / "Mi cena habitual" que añade de un toque una plantilla guardada (editable en Ajustes).

Al final: ejercicio (minutos aeróbicos con +15 / −15 y una casilla de "sesión de fuerza") y notas del día (texto libre).

Navegación entre días (anterior / siguiente) para corregir o rellenar días pasados.

### 3.2 Pantalla "Semana"

Semana de lunes a domingo. Muestra los contadores semanales con estado (bien / casi / falta) y cuántos días quedan:

| Indicador | Objetivo | Regla de conteo |
|---|---|---|
| Días con legumbre | mín. 3 | Un día cuenta si suma ≥ 0,5 raciones de legumbre |
| Pescado azul | mín. 2 | Veces en la semana |
| Carne roja | máx. 1 | Veces en la semana. Aviso visible si se supera |
| Queso | máx. 2 | Veces en la semana |
| Ejercicio aeróbico | 150 min | Suma de minutos |
| Sesiones de fuerza | mín. 2 | Días con la casilla marcada |

Ejemplo del texto que quiero ver: "Legumbre: 2 de 3 días · quedan 4 días". Si un objetivo ya no es alcanzable o un máximo está superado, decirlo claro.

También, el cumplimiento diario de la semana: para cada indicador diario (beta-glucanos, frutos secos, esteroles, fruta y verdura), los 7 días con un punto lleno si se cumplió, medio si se llegó al 50 %, vacío si no. Y un porcentaje global de la semana.

El panel de la semana también aparece resumido en "Hoy" (una línea por indicador), para ver cómo voy al apuntar.

### 3.3 Pantalla "Historial"

- Lista de días, del más reciente al más antiguo, con un resumen (porcentaje de objetivos diarios cumplidos, legumbre / pescado / carne / queso ese día, minutos de ejercicio) y las notas.
- Tocar un día lo abre en "Hoy".
- Resumen por semanas y por meses (porcentaje de cumplimiento), pensado para enseñárselo a la doctora y al endocrino. Un gráfico sencillo de evolución semanal sería un plus.

### 3.4 Pantalla "Ajustes"

- Objetivos editables (los de las tablas de arriba).
- Catálogo de alimentos editable: nombre, unidad, gramos por unidad, factores nutricionales, categoría, comidas en las que aparece primero.
- Plantillas ("Mi desayuno habitual", "Mi cena habitual").
- Copias de seguridad (ver sección 5).

## 4. Catálogo inicial de alimentos

Todos los factores son estimaciones y deben ser editables en Ajustes. Mostrar en la app una nota discreta de que son aproximados.

| Alimento | Unidad de entrada | Equivalencia | Aporta |
|---|---|---|---|
| Copos de avena Alea manzana y canela | g | — | 0,037 g beta-glucanos por g |
| Copos de avena natural | g | — | 0,04 g beta-glucanos por g |
| Salvado de avena | cucharada o g | 1 cucharada = 8 g | 0,07 g beta-glucanos por g |
| Galleta de avena Santiveri | unidad | 1 galleta = 12 g (pesar y ajustar) | 0,009 g beta-glucanos por g |
| Yogur desnatado | unidad | — | Solo registro |
| Nueces | g o unidad | 1 nuez entera = 4,5 g | Frutos secos (g) |
| Almendras | g o unidad | 1 almendra = 1,2 g | Frutos secos (g) |
| Pistachos | g | — | Frutos secos (g) |
| Danacol | botellita | — | 1,6 g esteroles |
| Legumbre en plato | ración | 150 g cocida | 1 ración de legumbre |
| Legumbre en ensalada | ración | 4-5 cucharadas, unos 80-100 g | 0,5 raciones de legumbre |
| Pescado azul | ración | — | 1 vez pescado azul |
| Pescado blanco | ración | — | Solo registro |
| Carne roja | ración | — | 1 vez carne roja |
| Ave sin piel | ración | — | Solo registro |
| Queso | ración | — | 1 vez queso |
| Fruta | pieza o ración | — | 1 ración fruta/verdura |
| Verdura o ensalada | ración | — | 1 ración fruta/verdura |
| Arándanos | ración | — | 1 ración fruta/verdura |
| Pan integral | rebanada | — | Solo registro |
| Café con leche desnatada | unidad | — | Solo registro |

Plantillas iniciales:

- Mi desayuno habitual: café con leche desnatada, yogur desnatado, 17 g de avena Alea, 2 galletas Santiveri.
- Mi cena habitual (postre): yogur natural, arándanos, 17 g de avena Alea, 2 cucharadas de salvado, 30 g de nueces, 1 Danacol.

## 5. Copias de seguridad

- Exportar: genera un JSON con todos los días, ajustes, catálogo y plantillas, con un campo schemaVersion. En iPhone usar navigator.share con el archivo (permite guardarlo en iCloud Drive, Archivos o mandarlo por correo). Si no está disponible, descarga directa.
- Importar: carga un JSON exportado. Mostrar un resumen antes de aplicar (cuántos días, rango de fechas) y elegir entre fusionar (los días del archivo pisan los mismos días locales) o reemplazar todo.
- Aviso de copia: si han pasado más de 7 días desde la última exportación, mostrar un aviso discreto en "Hoy" con botón para hacerla.
- Desde el PC, la misma web debe poder abrir un archivo exportado para consultarlo (importar en el navegador del PC).
- Migraciones: si cambia el modelo de datos, la app migra los datos guardados y los archivos importados de versiones anteriores según schemaVersion.

## 6. Modelo de datos (orientativo)

```json
{
  "schemaVersion": 1,
  "settings": { "goals": { "betaGlucanG": 3, "nutsG": 30, "sterolsG": 2, "fruitVegServings": 5,
                           "legumeDaysMin": 3, "oilyFishMin": 2, "redMeatMax": 1, "cheeseMax": 2,
                           "aerobicMin": 150, "strengthMin": 2 },
                "lastBackupAt": "2026-11-23T18:00:00Z" },
  "foods": [ { "id": "avena-alea", "name": "Copos de avena Alea", "unit": "g", "gramsPerUnit": 1,
               "category": "cereal", "meals": ["desayuno", "cena"],
               "contributes": { "betaGlucanPerG": 0.037 } } ],
  "templates": [ { "id": "desayuno-habitual", "meal": "desayuno", "items": [ { "foodId": "avena-alea", "qty": 17 } ] } ],
  "days": {
    "2026-11-23": {
      "meals": { "desayuno": [ { "id": "x1", "foodId": "avena-alea", "qty": 17 } ],
                 "comida": [], "merienda": [], "cena": [] },
      "aerobicMin": 30, "strength": false, "notes": "",
      "updatedAt": "2026-11-23T18:00:00Z"
    }
  }
}
```

Los totales (beta-glucanos, contadores, etc.) no se guardan: se calculan siempre a partir de lo apuntado y de los factores actuales.

## 7. Fases

1. Base: estructura del proyecto, PWA instalable y offline, capa de almacenamiento, pantalla "Hoy" con comidas, catálogo y panel del día. Despliegue en GitHub Pages.
2. Semana e historial: contadores semanales, resumen en "Hoy", historial con notas.
3. Copias de seguridad: exportar, importar con fusión o reemplazo, aviso de 7 días.
4. Ajustes: objetivos, catálogo y plantillas editables.
5. Extras: gráfico de evolución semanal o mensual, informe para la consulta.

Al terminar cada fase: probar en el navegador con tamaño de iPhone, desplegar y avisarme para probarla en el móvil.

## 8. Criterios de aceptación

- Instalada en la pantalla de inicio del iPhone, se abre sin barra de Safari y funciona sin conexión.
- Apuntar 17 g de avena Alea en el desayuno muestra unos 0,63 g de 3 g de beta-glucanos y una sugerencia para la cena.
- Apuntar una ensalada con legumbre el lunes y otra el miércoles muestra "Legumbre: 2 de 3 días".
- Cerrar la app, reiniciar el iPhone y volver a abrirla conserva todos los datos.
- Exportar en el iPhone, importar en el navegador del PC y ver los mismos días.
- Nada de lo que apunto sale del dispositivo salvo cuando exporto.

## 9. Notas para Claude Code

- Repositorio: rutina-ldl en mi cuenta de GitHub. Despliegue con GitHub Pages (rama main, carpeta raíz o dist/ vía GitHub Action).
- No soy programador: explica en el README, en lenguaje sencillo, cómo actualizar la app, cómo hacer y restaurar copias, y qué hacer si cambio de iPhone.
- Prioriza que sea robusta y simple frente a que tenga muchas funciones.
- Cuando dudes de un dato nutricional, déjalo editable y avísame en lugar de inventarlo.
