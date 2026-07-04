const vscode = require('vscode');
const https = require('https');

/**
 * Llama a la API pública y gratuita de Google Translate (endpoint no oficial "translate_a/single")
 * No requiere API key. Se usa como transporte HTTPS nativo para no depender de node_modules externos.
 */
function translateText(text, sourceLang, targetLang) {
  return new Promise((resolve, reject) => {
    const encodedText = encodeURIComponent(text);
    const params = `client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodedText}`;
    const options = {
      hostname: 'translate.googleapis.com',
      path: `/translate_a/single?${params}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';

      if (res.statusCode !== 200) {
        reject(new Error(`La API de traducción respondió con estado ${res.statusCode}`));
        res.resume();
        return;
      }

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // La respuesta es un array anidado: parsed[0] es una lista de fragmentos [traducido, original, ...]
          if (!parsed || !Array.isArray(parsed[0])) {
            reject(new Error('Respuesta de traducción inesperada.'));
            return;
          }
          const translated = parsed[0]
            .map(segment => (Array.isArray(segment) ? segment[0] : ''))
            .join('');

          if (!translated) {
            reject(new Error('No se pudo extraer la traducción de la respuesta.'));
            return;
          }

          resolve(translated);
        } catch (err) {
          reject(new Error('Error al procesar la respuesta de traducción: ' + err.message));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error('Error de red al traducir: ' + err.message));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Tiempo de espera agotado al contactar el servicio de traducción.'));
    });

    req.end();
  });
}

/**
 * Heurística para detectar si un texto "parece código" aunque no contenga
 * ningún literal de cadena. Se usa para evitar traducir por error nombres
 * de variables en asignaciones como:
 *   cancel = {
 *   local translations = {
 *   items = [
 * En estos casos no hay nada seguro que traducir, así que se deja el texto
 * exactamente igual en vez de enviarlo entero al traductor.
 */
function looksLikeCode(text) {
  const patterns = [
    // Palabras clave típicas de lenguajes de programación
    /\b(const|let|var|function|return|import|export|class|def|local|end|public|private|static|struct|interface)\b/,
    // variable = { ...   o   variable = [ ...
    /[A-Za-z_$][\w$]*\s*=\s*[{\[]/,
    // Línea compuesta únicamente por un símbolo de bloque: { } [ ] ( ) ;
    /^\s*[{}\[\]();]\s*$/m,
    // Línea que termina en { } o ;
    /[{};]\s*$/m
  ];
  return patterns.some((p) => p.test(text));
}

/**
 * Determina si un literal de cadena está actuando como CLAVE/ÍNDICE en vez
 * de como texto para el usuario. Por ejemplo:
 *   ["cancel"] = "Cancelled"   -> "cancel" es una clave (Lua, tablas, dicts)
 *   { "cancel": "Cancelled" }  -> "cancel" es una clave (JSON/JS)
 * Estas claves nunca deben traducirse, sin importar si son una o varias
 * palabras, porque el código las usa para buscar/indexar valores.
 *
 * @param {string} text Texto completo donde se buscó el literal.
 * @param {number} start Índice de inicio del literal (incluyendo la comilla).
 * @param {number} end Índice de fin del literal (excluyendo, tras la comilla de cierre).
 */
function isLikelyKey(text, start, end) {
  // Carácter no-espacio inmediatamente anterior al literal
  let i = start - 1;
  while (i >= 0 && /\s/.test(text[i])) i--;
  const prevChar = i >= 0 ? text[i] : '';

  // Carácter no-espacio inmediatamente posterior al literal
  let j = end;
  while (j < text.length && /\s/.test(text[j])) j++;
  const nextChar = j < text.length ? text[j] : '';

  // Notación de índice/clave entre corchetes: ["clave"] o ['clave']
  // (Lua, JavaScript, tablas de traducción, diccionarios, etc.)
  if (prevChar === '[' && nextChar === ']') return true;

  // Clave de objeto estilo JSON/JS: "clave": valor
  if (nextChar === ':') return true;

  return false;
}

function shouldSkipTranslation(str, onlyMultiWord) {
  const trimmed = str.trim();

  if (!trimmed) return true; // cadena vacía
  if (!/[a-zA-ZÀ-ÿ]/.test(trimmed)) return true; // sin letras (números, símbolos, etc.)
  if (/^(https?:\/\/|www\.)/i.test(trimmed)) return true; // URL
  if (/^\.{0,2}\//.test(trimmed)) return true; // ruta relativa: ./algo o ../algo o /algo
  if (/^[\w-]+\.[a-zA-Z0-9]+$/.test(trimmed) && !/\s/.test(trimmed)) return true; // nombre.extension
  if (onlyMultiWord && !/\s/.test(trimmed)) return true; // palabra suelta = probable identificador

  return false;
}

/**
 * Traduce el contenido de un template literal (backticks), preservando
 * cualquier expresión interpolada ${...} sin tocarla.
 */
async function translateTemplateLiteral(inner, sourceLang, targetLang, quote) {
  const EXPR_REGEX = /\$\{[^}]*\}/g;
  const parts = [];
  let lastIndex = 0;
  let m;

  while ((m = EXPR_REGEX.exec(inner)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ expr: false, value: inner.slice(lastIndex, m.index) });
    }
    parts.push({ expr: true, value: m[0] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < inner.length) {
    parts.push({ expr: false, value: inner.slice(lastIndex) });
  }

  const translatedParts = await Promise.all(
    parts.map(async (p) => {
      if (p.expr) return p.value; // nunca tocar ${...}
      // No aplicamos el filtro de "palabra suelta" aquí: al estar ya delimitado
      // por ${...}, un fragmento de una sola palabra suele ser texto real
      // (ej: "Hola ${nombre}") y no un identificador de código.
      if (shouldSkipTranslation(p.value, false)) return p.value;
      try {
        return await translateText(p.value, sourceLang, targetLang);
      } catch (err) {
        return p.value; // ante un fallo puntual, no romper todo el resultado
      }
    })
  );

  return quote + translatedParts.join('') + quote;
}

/**
 * Traducción "consciente del código": si el texto seleccionado contiene
 * literales de cadena (comillas simples, dobles o backticks), traduce
 * ÚNICAMENTE el contenido dentro de esas comillas y deja el resto
 * (nombres de variables, funciones, keywords, sintaxis) intacto.
 *
 * Si no se detecta ningún literal de cadena, se traduce todo el texto
 * seleccionado tal cual (comportamiento para texto plano / comentarios).
 */
async function translateCodeAware(text, sourceLang, targetLang, onlyMultiWord) {
  const STRING_REGEX = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
  const matches = [...text.matchAll(STRING_REGEX)];

  if (matches.length === 0) {
    // Si no hay ningún literal de cadena pero el texto tiene pinta de código
    // (ej: "cancel = {", "items = [", "local traducciones = {"), no hay nada
    // seguro que traducir: se deja exactamente igual para no mistraducir
    // nombres de variables.
    if (looksLikeCode(text)) {
      return text;
    }
    return await translateText(text, sourceLang, targetLang);
  }

  const translatedMatches = await Promise.all(
    matches.map(async (m) => {
      const raw = m[0];
      const quote = raw[0];
      const inner = raw.slice(1, -1);
      const start = m.index;
      const end = m.index + raw.length;

      if (quote === '`') {
        const translated = await translateTemplateLiteral(inner, sourceLang, targetLang, quote);
        return { start, end, translated };
      }

      // Si el literal actúa como clave/índice (["cancel"] = ..., "cancel": ...),
      // nunca se traduce, independientemente de si es una o varias palabras.
      if (isLikelyKey(text, start, end)) {
        return { start, end, translated: raw };
      }

      if (shouldSkipTranslation(inner, onlyMultiWord)) {
        return { start, end, translated: raw };
      }

      try {
        const translatedInner = await translateText(inner, sourceLang, targetLang);
        return { start, end, translated: quote + translatedInner + quote };
      } catch (err) {
        return { start, end, translated: raw };
      }
    })
  );

  let result = '';
  let cursor = 0;
  for (const tm of translatedMatches) {
    result += text.slice(cursor, tm.start);
    result += tm.translated;
    cursor = tm.end;
  }
  result += text.slice(cursor);

  return result;
}

function activate(context) {
  const disposable = vscode.commands.registerCommand('translateSelection.toSpanish', async () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      vscode.window.showWarningMessage('No hay ningún editor activo.');
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText || selectedText.trim().length === 0) {
      vscode.window.showWarningMessage('Selecciona primero el texto que quieres traducir.');
      return;
    }

    const config = vscode.workspace.getConfiguration('translateSelection');
    const sourceLang = config.get('sourceLanguage', 'auto');
    const replaceInPlace = config.get('replaceInPlace', true);
    const smartCodeMode = config.get('smartCodeMode', true);
    const onlyMultiWordStrings = config.get('onlyMultiWordStrings', false);

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Traduciendo al español...',
        cancellable: false
      },
      async () => {
        try {
          const translated = smartCodeMode
            ? await translateCodeAware(selectedText, sourceLang, 'es', onlyMultiWordStrings)
            : await translateText(selectedText, sourceLang, 'es');

          if (replaceInPlace) {
            if (translated === selectedText) {
              vscode.window.showInformationMessage(
                'No se encontró texto traducible en la selección (parece ser solo código).'
              );
              return;
            }

            const success = await editor.edit(editBuilder => {
              editBuilder.replace(selection, translated);
            });

            if (!success) {
              vscode.window.showErrorMessage('No se pudo reemplazar el texto seleccionado en el editor.');
              return;
            }

            vscode.window.showInformationMessage('Texto traducido correctamente.');
          } else {
            const seleccion = await vscode.window.showInformationMessage(
              `Traducción: ${translated}`,
              'Copiar al portapapeles'
            );
            if (seleccion === 'Copiar al portapapeles') {
              await vscode.env.clipboard.writeText(translated);
              vscode.window.showInformationMessage('Traducción copiada al portapapeles.');
            }
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            `Error al traducir: ${error.message || 'Error desconocido.'}`
          );
        }
      }
    );
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
