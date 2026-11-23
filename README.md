# Rutina LDL

App personal para el iPhone que registra lo que como en cada comida y calcula cómo voy frente a mis objetivos para bajar el LDL. La especificación completa está en [SPEC.md](SPEC.md).

**Estado:** fase 1 (base) terminada: pantalla "Hoy" con panel del día, sugerencias, comidas, catálogo, plantillas, ejercicio y notas. Funciona sin conexión. Las pantallas Semana, Historial, copias de seguridad y Ajustes editables llegan en las fases siguientes.

## Instalar en el iPhone

1. Abre en **Safari** la dirección de la app: `https://<tu-usuario>.github.io/rutina-ldl/`
2. Toca el botón **Compartir** (el cuadrado con la flecha hacia arriba).
3. Elige **Añadir a pantalla de inicio** → **Añadir**.
4. Abre la app desde el icono nuevo. Se abre a pantalla completa, sin la barra de Safari.

Úsala siempre desde el icono, no desde Safari: los datos que apuntas en el icono y los de Safari se guardan por separado.

## Dónde están mis datos

- Todo se guarda **solo en el iPhone**, dentro de la propia app (IndexedDB). No hay servidor, cuentas ni nada que salga del móvil.
- La web de GitHub solo contiene el programa, nunca tus datos.
- Al instalarla en la pantalla de inicio, iOS protege los datos para que no se borren solos.
- **Ojo:** si borras la app de la pantalla de inicio, se borran sus datos. Haz copias (llegan en la fase 3).

## Cómo actualizar la app

Cuando haya una versión nueva publicada en GitHub, no tienes que hacer nada: la próxima vez que abras la app con conexión se descarga sola (si no se nota, ciérrala del todo y vuelve a abrirla). Tus datos no se tocan.

Para publicar cambios: se suben los archivos a la rama `main` del repositorio `rutina-ldl` y GitHub Pages los publica en uno o dos minutos.

## Copias de seguridad y cambio de iPhone

Llega en la fase 3: un botón **Exportar** en Ajustes que guarda un archivo `.json` en Archivos / iCloud Drive o lo manda por correo, y un botón **Importar** para recuperarlo. Para cambiar de iPhone: exportar en el viejo, instalar la app en el nuevo e importar el archivo. Este apartado se completará con los pasos exactos.

## Detalles técnicos (por si alguien toca el código)

**Por qué sin framework ni paso de compilación:** la app es pequeña (cuatro pantallas y unos cálculos). Con HTML, CSS y JavaScript normales, los archivos del repositorio son exactamente los que se publican: no hace falta instalar Node, ni compilar, ni una GitHub Action que pueda fallar. Menos piezas = más robusto y más fácil de mantener sin ser programador.

| Archivo | Qué hace |
|---|---|
| `index.html` | Página única de la app |
| `css/styles.css` | Estilos (modo claro y oscuro automáticos, zonas seguras del iPhone) |
| `js/app.js` | Pantallas y botones |
| `js/calc.js` | Cálculo de totales y sugerencias (nada se guarda, todo se recalcula) |
| `js/defaults.js` | Objetivos, catálogo y plantillas iniciales |
| `js/storage.js` | **Única** puerta de acceso a los datos (IndexedDB). Para cambiar de sistema de almacenamiento solo se toca este archivo |
| `sw.js` | Service worker: funcionamiento sin conexión y actualizaciones |
| `manifest.webmanifest`, `icons/` | Instalación como app |

- El service worker usa "primero la red, si no la caché": con conexión siempre carga lo último publicado; sin conexión, lo guardado. Si se añade un archivo nuevo a la app, hay que añadirlo a la lista `FILES` de `sw.js` y subir `VERSION`.
- El modelo de datos lleva `schemaVersion`. Si cambia, se añade un paso en `migrate()` de `storage.js`.
- Probar en el PC: `python -m http.server 8765` en la carpeta y abrir `http://localhost:8765`.

## Publicar en GitHub Pages (una sola vez)

1. Crear el repositorio `rutina-ldl` en GitHub y subir estos archivos a la rama `main`.
2. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)` → **Save**.
3. En un par de minutos la app está en `https://<tu-usuario>.github.io/rutina-ldl/`.

Nota: en una cuenta gratuita de GitHub, Pages exige que el repositorio sea público. Lo público es solo el código; tus comidas nunca se suben.
