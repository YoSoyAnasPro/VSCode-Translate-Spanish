# Changelog

Todas las versiones notables de esta extensión se documentan en este archivo.

## [1.0.4] - 2026-07-04

### Cambiado
- **Las palabras sueltas ahora se traducen por defecto.** Antes, cadenas de una sola palabra como `"Cancel"` o `"button"` se dejaban intactas por precaución. Ahora `translateSelection.onlyMultiWordStrings` pasa a `false` por defecto, así que también se traducen — pero de forma segura: las protecciones ya existentes (claves de objeto/tabla, identificadores sin comillas, rutas, URLs) se mantienen intactas, así que una palabra suelta que sea una **clave** (`["cancel"] = ...` o `"cancel": ...`) sigue sin traducirse, y solo se traduce cuando actúa como **valor** de texto real.
- Quien prefiera el comportamiento anterior (no traducir ninguna palabra suelta) puede reactivarlo marcando `translateSelection.onlyMultiWordStrings` en Ajustes.

## [1.0.3] - 2026-07-04

### Añadido
- **Muchos más idiomas de origen.** El campo `translateSelection.sourceLanguage` ahora ofrece un desplegable con más de 70 idiomas (inglés, francés, alemán, italiano, portugués, chino simplificado/tradicional, japonés, coreano, árabe, ruso, hindi, y muchos más), además de la detección automática (`auto`).
- **Protección de bloques `variable = {...}` / `variable = [...]` sin comillas.** Si seleccionas una asignación de objeto o array sin ningún texto entre comillas (por ejemplo `cancel = {`, `items = [`, `local traducciones = {`), la extensión detecta que es código y no traduce nada, evitando mistraducir el nombre de la variable. Antes, si la selección no contenía comillas, se enviaba entera al traductor y podía romper el nombre de la variable.
- Aviso informativo cuando la selección no tiene ningún texto traducible ("parece ser solo código"), en vez de fallar en silencio.
- Icono propio para la extensión.

### Cambiado
- **Nuevo atajo de teclado: `Shift+Alt+T`** (antes `Ctrl+Alt+T` / `Cmd+Alt+T`), igual en Windows, Linux y Mac.
- Nuevo nombre visible: **VSCode Translate Spanish**.
- Categoría de la extensión cambiada a `Formatters`.

## [1.0.2] - 2026-07-04

### Corregido
- **Claves de objeto/tabla traducidas por error.** En patrones como `["cancel"] = "Cancelled"` (tablas Lua, diccionarios) o `{"cancel": "Cancelled"}` (JSON/JS), el string `"cancel"` se traducía como si fuera texto normal, rompiendo la clave usada por el código para indexar valores.
- Ahora se detecta cuándo un literal de cadena actúa como **clave/índice** en lugar de texto:
  - Notación de corchetes: `["clave"]` o `['clave']`.
  - Notación de objeto: `"clave": valor`.
  - En ambos casos la clave se deja intacta y **solo se traduce el valor**, sin importar si la clave tiene una o varias palabras.

**Ejemplo:**
```lua
-- Antes (v1.0.1): "cancel" se traducía incorrectamente
["cancel"] = "Cancelled",

-- Ahora (v1.0.2): la clave se respeta, solo se traduce el valor
["cancel"] = "Cancelado",
```

## [1.0.1] - 2026-07-04

### Añadido
- **Modo consciente del código (`smartCodeMode`).** Si el texto seleccionado contiene literales de cadena (`"texto"`, `'texto'`, `` `texto` ``), la extensión ahora traduce **únicamente el contenido entre comillas**, dejando intactos nombres de variables, funciones, keywords y el resto de la sintaxis.
- Soporte para **template literals** (`` `hola ${nombre}` ``): el texto se traduce respetando las expresiones interpoladas `${...}`, que nunca se tocan.
- Nueva opción `translateSelection.smartCodeMode` (activada por defecto) para activar/desactivar este comportamiento. Si se desactiva, se vuelve a traducir siempre la selección completa tal cual (comportamiento de la v1.0.0).
- Nueva opción `translateSelection.onlyMultiWordStrings` (activada por defecto): evita traducir cadenas de una sola palabra sin espacios (ej. `"button"`, `"ERROR_CODE"`), tratándolas como posibles identificadores o valores técnicos en vez de texto real.
- Filtros de seguridad adicionales para no traducir nunca: rutas relativas (`"./utils/helper.js"`), URLs (`"https://..."`) y cadenas sin ninguna letra.

### Cambiado
- Si la selección **no** contiene ningún literal de cadena (por ejemplo, un comentario o un párrafo de texto plano), se sigue traduciendo todo el texto seleccionado como en la v1.0.0.

## [1.0.0] - 2026-07-04

### Añadido
- Primera versión de la extensión.
- Comando y atajo de teclado `Ctrl+Alt+T` (Windows/Linux) / `Cmd+Alt+T` (Mac) para traducir al español el texto seleccionado en el editor. Solo se activa cuando hay una selección activa (`editorHasSelection`), evitando interferir con otros atajos de VSCode.
- Traducción mediante el endpoint público de Google Translate (`translate.googleapis.com`), sin necesidad de API key.
- Dos modos de salida configurables:
  - **Reemplazar en el editor** (por defecto): sustituye el texto seleccionado por su traducción.
  - **Mensaje emergente**: muestra la traducción sin modificar el archivo, con opción de copiarla al portapapeles.
- Opción `translateSelection.sourceLanguage` para fijar el idioma de origen o dejarlo en detección automática (`auto`).
- Manejo de errores: sin selección, sin conexión, timeout o respuesta inválida del servicio de traducción.
