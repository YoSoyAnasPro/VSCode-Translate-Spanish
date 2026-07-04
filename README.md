# VSCode Translate Spanish

**Versión actual: 1.0.4** — consulta [`CHANGELOG.md`](./CHANGELOG.md) para ver el historial completo de cambios de cada versión.

Extensión de VSCode que traduce el texto seleccionado al español con un solo atajo de teclado.

## Características

- **Atajo de teclado:** `Shift+Alt+T` (Windows/Linux/Mac).
  Este atajo no está usado por defecto en VSCode y solo se activa cuando **hay texto seleccionado** (`editorHasSelection`), por lo que no interfiere con otros comandos.
- **Traducción consciente del código:** si seleccionas código con literales de cadena (`"texto"`, `'texto'`, `` `texto` ``), la extensión traduce **solo el contenido entre comillas** y deja intactos nombres de variables, funciones, keywords y el resto de la sintaxis. Si seleccionas texto plano (sin comillas, por ejemplo un comentario o un párrafo), se traduce todo tal cual.

  Ejemplo:

  ```js
  // Antes de traducir
  const message = "hello world";

  // Después de pulsar Shift+Alt+T con esa línea seleccionada
  const message = "hola mundo";
  ```

  El nombre `message` nunca se toca; solo se traduce el texto entre comillas.

  También respeta expresiones interpoladas en template literals:

  ```js
  const msg = `hello ${userName}, you have new messages`;
  // ->
  const msg = `hola ${userName}, tienes nuevos mensajes`;
  ```

  Por seguridad, no se traducen (se dejan igual):
  - Rutas relativas (`"./utils/helper.js"`) y URLs (`"https://..."`).
  - Cadenas sin ninguna letra (números, símbolos, etc.).
  - **Claves de objetos/tablas**, tengan una o varias palabras: `["cancel"] = "Cancelled"` o `{"cancel": "Cancelled"}` → solo se traduce el valor (`"Cancelled"`), la clave (`cancel`) nunca se toca, aunque también sea una sola palabra.
  - **Bloques de asignación sin comillas** como `cancel = {`, `items = [` o `local traducciones = {`: si la selección no contiene ningún texto entre comillas y tiene pinta de código (palabras clave, `variable = {`, líneas que terminan en `{`, `}` o `;`), no se traduce nada para evitar mistraducir el nombre de la variable.

  Desde la versión 1.0.4, **las palabras sueltas dentro de comillas también se traducen** (ej: `"Cancel"` → `"Cancelar"`), siempre que no estén actuando como clave. Si prefieres que las palabras sueltas nunca se traduzcan (comportamiento de versiones anteriores), activa `translateSelection.onlyMultiWordStrings`.

  El modo consciente del código se puede desactivar por completo (`smartCodeMode: false`) para volver a traducir siempre la selección completa tal cual.

- Traduce automáticamente desde cualquier idioma detectado (`auto`) al español, o desde un idioma fijo configurable.
- Dos modos de funcionamiento, configurables:
  - **Reemplazar en el editor** (por defecto): sustituye el texto seleccionado por su traducción.
  - **Mostrar en un mensaje emergente**: muestra la traducción sin modificar el archivo, con opción de copiarla al portapapeles.
- No requiere API key: usa el endpoint público de Google Translate.
- Manejo de errores: sin selección, sin conexión, timeout, o respuesta inválida del servicio.

## Configuración

Puedes ajustar el comportamiento desde `Ajustes` (busca "translateSelection"):

| Opción                                    | Valores                                                                                     | Descripción                                                                                                                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `translateSelection.replaceInPlace`       | `true` / `false`                                                                            | Si es `true` (por defecto), reemplaza el texto seleccionado. Si es `false`, solo lo muestra en un mensaje.                                                                                                  |
| `translateSelection.sourceLanguage`       | `"auto"`, `"en"`, `"fr"`, etc. (más de 70 idiomas disponibles en el desplegable de Ajustes) | Idioma de origen. Por defecto detecta automáticamente.                                                                                                                                                      |
| `translateSelection.smartCodeMode`        | `true` / `false`                                                                            | Si es `true` (por defecto), en código solo traduce el texto entre comillas y no toca variables/funciones. Si es `false`, traduce siempre toda la selección.                                                 |
| `translateSelection.onlyMultiWordStrings` | `true` / `false`                                                                            | Si es `true`, no traduce cadenas de una sola palabra. Si es `false` (por defecto desde 1.0.4), también traduce palabras sueltas, salvo que actúen como clave. Solo aplica si `smartCodeMode` está activado. |

## Notas

- El servicio de traducción usado es un endpoint público no oficial de Google Translate (`translate.googleapis.com`), por lo que requiere conexión a internet.
- Puedes cambiar el atajo de teclado en `Preferencias → Métodos abreviados de teclado`, buscando "Traducir selección al Español".
