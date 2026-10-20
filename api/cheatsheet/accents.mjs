// Colouring a code line token by token instead of all at once.
//
// A `sheet.json` line used to carry one `role` for the whole line, and the code
// panel drew it in one colour. That is wrong wherever a line holds more than
// one kind of thing, which is most lines: `<input type="email" required>` is a
// tag, two attribute names and a string, and one colour has to pick one of
// them. The line it was reported on holds an attribute and a word of prose, and
// no single role is right for it.
//
// What replaces it is **Clean Language Accents**, from the drawing surface's
// `markdown` part: highlight.js reads the code, the surface reads its output
// back into runs - a start, an end and the scope that coloured it - and this
// module turns each scope into one of the six roles `DESIGN_LANGUAGE.md`
// already names. The palette does not change. Only how a token's colour is
// chosen does.
//
// ## Two entries, loaded on demand
//
// The accent reader is the heaviest thing this repository can load: measured on
// 2026.10.20 with `napkin-sketch vendor --list`, the `markdown` part is 328.0 KB
// gzipped against 49.5 KB for the composition entry the page draws through, and
// `accentRuns` itself is exported from the whole API, which is 269.1 KB. So
// neither is imported at the top of this file. {@link prepareAccents} imports
// both dynamically, once, and a caller that never asks for accents never pays
// for them - the page's first module graph stays at the composition entry, and
// the reader arrives alongside the first `sheet.json` rather than in front of
// it.
//
// That is also why {@link composeSheet} stays synchronous. Preparing is the
// asynchronous half and it happens once per process; drawing reads whatever is
// installed at the moment it runs. A caller that draws without preparing gets
// the per-line `role` as the fallback, which is what every `sheet.json` still
// carries.
//
// ```js
// import { prepareAccents } from "./api/cheatsheet/index.mjs";
//
// await prepareAccents();          // once, before the first sheet is drawn
// const { composition } = composeSheet(doc, { seed: doc.seed });
// ```

/** The entries loaded on demand: the reader, and the API that reads with it. */
const MARKDOWN_ENTRY = "../napkin-sketch/markdown/index.js";
const API_ENTRY = "../napkin-sketch/api/index.js";

/**
 * The accent functions, once they have been loaded, or null.
 *
 * Module state rather than a parameter threaded through the composer, because
 * installing a reader is a process-wide act in the surface as well: importing
 * the `markdown` entry calls `setAccentHighlighter`, and every later
 * `accentRuns` in that process reads with it.
 */
let installed = null;

/** The in-flight load, so concurrent callers await one import rather than racing. */
let loading = null;

/**
 * This repository's six roles, keyed by the surface's nine.
 *
 * The surface classifies a scope into an `AccentRole`, of which there are
 * nine, and this is the step down to the six the sheets are drawn in. Two of
 * the nine have no counterpart here: `addition` and `deletion` are diff
 * markers, and `DESIGN_LANGUAGE-html-css.md` settled that an unused role is
 * left unused rather than forced, because a colour on the sheet that nothing
 * on it means is worse than no colour.
 *
 * **`ACCENT_SCOPES` carries eleven values rather than nine, and the two this
 * table omits are omitted deliberately.** A scope is also allowed to be
 * `base` - the surrounding ink, which is what an operator or a piece of
 * punctuation takes - or `inherit`, the colour of the scope around it.
 * Neither names a colour of its own, so `accentRuns` reports no run for
 * either: a `base` scope is dropped, and an `inherit` one resolves outwards
 * to the nearest enclosing scope that does name a colour, which is the scope
 * the run comes back under. Nothing scoped `base` or `inherit` reaches
 * {@link roleForScope}, which is why its `plain` default is a guard rather
 * than the colour those two draw in.
 */
export const ACCENT_ROLE_ROLES = {
  keyword: "keyword",
  string: "string",
  number: "number",
  comment: "comment",
  title: "identifier",
  type: "identifier",
  tag: "keyword",
  addition: "plain",
  deletion: "plain",
};

/**
 * The scopes this repository's own design languages have already settled.
 *
 * Read before {@link ACCENT_ROLE_ROLES}, and every entry is here because a
 * recorded rule says what colour the token takes and the surface groups it
 * with something else. The surface is classifying for its own two themes,
 * where `attr` and `number` are one blue; the sheets have two different greens
 * for them and a rule saying which is which, so the rule wins.
 *
 * From **What this category adds on top of the global record** in
 * `DESIGN_LANGUAGE-html-css.md`: structure is yellow, configuration green,
 * content white.
 *
 * - An attribute name, a CSS property and a JavaScript property are
 *   configuration: `identifier`, pale green. The surface calls all three
 *   `number`, which on a sheet is the bright green it reserves for numeric
 *   literals.
 * - A selector and a doctype are structure: `keyword`, pale yellow. The
 *   surface calls a class or id selector `number` and a doctype `number` by
 *   way of `meta`, and neither reads as a value.
 * - A regular expression literal is a literal: `string`, amber. The surface
 *   groups it with `tag`, which on a sheet is the yellow of structure.
 */
export const SCOPE_ROLES = {
  attr: "identifier",
  attribute: "identifier",
  property: "identifier",
  "selector-id": "keyword",
  "selector-class": "keyword",
  "selector-attr": "keyword",
  "selector-pseudo": "keyword",
  meta: "keyword",
  regexp: "string",
};

/**
 * The role a scope draws in, or `plain` for one nothing has a colour for.
 *
 * Read as own properties, the guard `roleColor` in `compose.mjs` carries for
 * the same reason: a scope named `constructor` would otherwise find a function
 * on `Object.prototype` and reach the renderer as a paint.
 *
 * @param {string} scope A highlight.js scope, as the surface reports it.
 * @param {Record<string, string>} scopes The surface's `ACCENT_SCOPES`.
 * @returns {'plain' | 'comment' | 'identifier' | 'keyword' | 'string' | 'number'}
 */
export function roleForScope(scope, scopes) {
  const own = (table, key) => (Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined);
  const settled = own(SCOPE_ROLES, scope);
  if (settled) return settled;
  const accentRole = own(scopes, scope);
  return (accentRole && own(ACCENT_ROLE_ROLES, accentRole)) || "plain";
}

/**
 * Loads the accent reader and the API that reads with it, once.
 *
 * Returns what happened rather than throwing. A page or a tool that cannot
 * reach the entries still draws - every sheet carries a per-line `role` as the
 * fallback - and a composition that fell back silently is the case this
 * repository has been bitten by before, so the reason comes back to be
 * reported.
 *
 * @returns {Promise<{ ready: boolean, reason: string | null }>}
 */
export function prepareAccents() {
  if (installed) return Promise.resolve({ ready: true, reason: null });
  if (!loading) {
    loading = (async () => {
      // The reader first: importing it is what calls `setAccentHighlighter`,
      // and the API below reads with whatever is installed when it is called.
      await import(MARKDOWN_ENTRY);
      const api = await import(API_ENTRY);
      if (typeof api.accentRuns !== "function" || !api.ACCENT_SCOPES) {
        throw new Error("the vendored API exports no accentRuns or ACCENT_SCOPES");
      }
      installed = { accentRuns: api.accentRuns, scopes: api.ACCENT_SCOPES };
      return { ready: true, reason: null };
    })().catch((error) => {
      loading = null;
      return { ready: false, reason: `the accent reader could not be loaded: ${error.message}` };
    });
  }
  return loading;
}

/** Whether a code line can be coloured token by token in this process. */
export function accentsReady() {
  return installed !== null;
}

/**
 * Forgets the loaded reader. For tests that need the un-prepared path back.
 *
 * It does not uninstall the highlighter in the surface - nothing here should
 * reach into process-wide state it did not create - so what this restores is
 * this module's own fallback, which is what the fallback path is.
 */
export function forgetAccents() {
  installed = null;
  loading = null;
}

/**
 * One stretch of a line in one role.
 *
 * @typedef {object} RoleRun
 * @property {number} start Index into the line's own text.
 * @property {number} end Index into the line's own text, exclusive.
 * @property {'plain' | 'comment' | 'identifier' | 'keyword' | 'string' | 'number'} role
 */

/**
 * The code's lines, each as runs of one role, or null when nothing read it.
 *
 * The whole block is read at once and then cut up, never line by line, because
 * a comment or a string may run across lines and a line read on its own is a
 * fragment of a different program. `tag` covering the newline inside a wrapped
 * tag is the ordinary case of this.
 *
 * Every line comes back fully covered: the gaps between the surface's runs are
 * the tokens it has no colour for - an operator, punctuation, the whitespace of
 * an indent, the prose between two tags - and those are `plain`, which is the
 * colour the sheets give exactly that. A line with no runs over it at all is
 * one `plain` run, not an empty list, so a caller never has to decide what an
 * uncoloured line means.
 *
 * @param {string[]} texts The lines, in order, exactly as they are drawn.
 * @param {string} language A language id or alias, or `auto`, or `none`.
 * @returns {{ lines: RoleRun[][], language: string | null, missing: string | null } | null}
 */
export function accentRoles(texts, language) {
  if (!installed || !language) return null;

  const { accentRuns, scopes } = installed;
  const code = texts.join("\n");
  const read = accentRuns(code, language);

  // `missing` names a language nothing is registered under, and comes with no
  // runs. Returning it rather than an empty reading is the whole point of the
  // field: a sheet in a language nobody installed says so instead of drawing
  // every line plain and looking composed.
  if (read.missing) return { lines: [], language: read.language, missing: read.missing };

  // Where each line starts in the joined text, so an absolute run can be cut
  // back to the line it falls in.
  const starts = [];
  let at = 0;
  for (const text of texts) {
    starts.push(at);
    at += text.length + 1;
  }

  const lines = texts.map((text, index) => {
    const lineStart = starts[index];
    const lineEnd = lineStart + text.length;
    /** @type {RoleRun[]} */
    const runs = [];
    let cursor = 0;
    // Adjacent stretches in the same role are one run, not two. The surface
    // scopes `</`, `label` and `>` separately and all three are structure here,
    // so merging turns seven elements into four on the line this was reported
    // on - and a stretch drawn as one element cannot develop a seam in the
    // middle of itself, which is the thing a split line risks.
    const add = (start, end, role) => {
      const last = runs[runs.length - 1];
      if (last && last.role === role && last.end === start) last.end = end;
      else runs.push({ start, end, role });
    };
    for (const run of read.runs) {
      if (run.end <= lineStart || run.start >= lineEnd) continue;
      const start = Math.max(run.start, lineStart) - lineStart;
      const end = Math.min(run.end, lineEnd) - lineStart;
      if (end <= start) continue;
      if (start > cursor) add(cursor, start, "plain");
      add(start, end, roleForScope(run.scope, scopes));
      cursor = end;
    }
    if (cursor < text.length) add(cursor, text.length, "plain");
    return runs;
  });

  return { lines, language: read.language, missing: null };
}
