// Writing a render to disk: the one module in this folder that does.
//
// **This module reads `node:fs` and is not exported from `index.mjs`**, which
// is the same split the drawing surface makes between `graphic-design/index.js`
// and `graphic-design/files.js`, and for the same reason: the page loads this
// folder with a bare `import` and no build step, so a module in the static
// graph of `index.mjs` that reaches a Node builtin fails in a browser at load
// rather than at the call. A script reaches it by path:
//
//     import { writeRender } from "./api/cheatsheet/files.mjs";
//
// Nothing here is needed in a browser anyway. A page that wants a file from a
// sheet has `render.data` and an anchor, and a page cannot write to disk.
//
// ## The three places output can go, and why they are one argument
//
//     writeRender(render, "out/splicing.webp")  ->  that exact file
//     writeRender(render, "out/")               ->  out/<derived name>.webp
//     writeRender(render, null)                 ->  nothing written; the bytes come back
//     writeRender(render, "-")                  ->  standard output
//
// One argument rather than a flag per destination, because the four cases are
// four values of the same question and a caller choosing between them is
// choosing a string. The derived name is the sheet's own title slugged, per
// `filenameFor` in `render.mjs`, so a directory is a complete instruction and
// not a half of one.
//
// The in-memory case is `null` rather than a separate function: a render is
// already in memory by the time it reaches here, so "write it nowhere" is the
// honest shape of that request. It is what a caller embedding a sheet in a
// response wants, and it costs a branch rather than an API.
//
// ## Telling a directory from a file
//
// A target is a directory when it ends in a separator, or when its last segment
// has no extension of its own. Guessing from the extension is what lets both be
// written without a second argument to say which was meant.
//
// The extension is looked for in the last segment with its leading dots taken
// off first, or a dot directory reads as an extension and nothing else: `.tmp`
// ends in `.tmp`, so `.tmp` as a target resolved to the folder itself and the
// write failed with `EISDIR`. That trap is recorded here rather than in
// `tools/cheatsheet.mjs`, which found it, so there is one copy of the rule.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";

import { composeSheet } from "./compose.mjs";
import { filenameFor, renderOf } from "./render.mjs";

/**
 * Where a render is going, read off the target a caller named.
 *
 * @typedef {object} RenderTarget
 * @property {string | null} path The resolved file, or `null` where nothing is written.
 * @property {boolean} stdout Whether the bytes go to standard output.
 * @property {boolean} derived Whether the filename was derived rather than named.
 */

/**
 * What a write produced.
 *
 * @typedef {object} WrittenRender
 * @property {string | null} path The file written, `-` for standard output, `null` for neither.
 * @property {number} bytes
 * @property {Uint8Array} data The same bytes the render carried, so a caller needs only this result.
 * @property {boolean} wrote Whether anything left the process.
 * @property {boolean} derived Whether the filename was derived from the sheet's title.
 */

/**
 * Whether a target names a directory rather than a file.
 *
 * The rule under **Telling a directory from a file** above, as one function
 * because two callers apply it: this module, and `destinationFor` in
 * `tools/cheatsheet.mjs`, which found the dot directory trap and then had its
 * own copy of the fix. Two copies of a rule that took a failed write to find is
 * one copy too many.
 *
 * @param {string} target
 * @returns {boolean}
 */
export function namesDirectory(target) {
  const named = String(target);
  const last = named.split(/[\\/]/).pop() ?? "";
  return /[\\/]$/.test(named) || !/\.[A-Za-z0-9]+$/.test(last.replace(/^\.+/, ""));
}

/**
 * Reads a target into the decision of where the bytes go.
 *
 * Exported because the decision is worth making without taking it: a caller
 * reporting what it is about to write, or refusing a destination of its own,
 * needs the path and not the write. `tools/cheatsheet.mjs` applies its own
 * publish rule on top of this one.
 *
 * @param {import('./render.mjs').SheetRender} render
 * @param {string | null | undefined} target
 * @param {{ name?: string, root?: string }} [options]
 * @returns {RenderTarget}
 */
export function targetFor(render, target, options = {}) {
  if (target === null || target === undefined) {
    return { path: null, stdout: false, derived: false };
  }
  const named = String(target);
  if (named === "-") return { path: "-", stdout: true, derived: false };
  if (named.trim().length === 0) {
    throw new Error(
      "cheatsheet: a render target is a file, a directory, `-` for standard output, or null for " +
        "none. An empty string is none of those."
    );
  }
  const root = options.root === undefined ? undefined : String(options.root);
  const given = root === undefined || isAbsolute(named) ? resolve(named) : resolve(root, named);
  if (!namesDirectory(named)) return { path: given, stdout: false, derived: false };
  return {
    path: resolve(given, filenameFor(render, options.name)),
    stdout: false,
    derived: options.name === undefined,
  };
}

/**
 * Writes a render to a named path, to a directory under a derived filename, to
 * standard output, or nowhere at all.
 *
 * The bytes come back on every route, including the ones that wrote them, so a
 * caller that wants the file and the data does not have to read the file back.
 *
 * @param {import('./render.mjs').SheetRender} render
 * @param {string | null} [target] A file, a directory, `-`, or `null` for none.
 * @param {{ name?: string, root?: string }} [options]
 * @returns {Promise<WrittenRender>}
 */
export async function writeRender(render, target = null, options = {}) {
  if (!render || !(render.data instanceof Uint8Array)) {
    throw new Error(
      "cheatsheet: a write needs a render from `renderSheet` or `renderOf`, which carries its " +
        "bytes as `data`. This was handed something else."
    );
  }
  const where = targetFor(render, target, options);
  const result = {
    path: where.path,
    bytes: render.data.byteLength,
    data: render.data,
    wrote: false,
    derived: where.derived,
  };
  if (where.path === null) return result;
  if (where.stdout) {
    // The one route where the bytes and any report about them cannot share a
    // stream. A caller writing a report alongside this sends it to stderr.
    process.stdout.write(render.data);
    return { ...result, wrote: true };
  }
  await mkdir(dirname(where.path), { recursive: true });
  await writeFile(where.path, render.data);
  return { ...result, wrote: true };
}

/**
 * Composes a document, renders it, and writes it, in one call.
 *
 * The whole route from a document to a file. The render comes back beside the
 * write, because what answered and whether it may be published is the half of
 * the result a caller reports on.
 *
 * @param {import('./document.mjs').SheetDocument} doc
 * @param {string | null} [target]
 * @param {import('./compose.mjs').ComposeOptions & import('./render.mjs').RenderOptions & { name?: string, root?: string }} [options]
 * @returns {Promise<{ render: import('./render.mjs').SheetRender, written: WrittenRender }>}
 */
export async function renderToFile(doc, target = null, options = {}) {
  const { name, root, ...rest } = options ?? {};
  // Split by hand rather than passed whole, because `render.mjs` refuses an
  // option it does not know by name, and `name` and `root` are this module's.
  const render = await renderOf(composeSheet(doc, composeHalf(rest)), renderHalf(rest));
  const written = await writeRender(render, target, {
    ...(name === undefined ? {} : { name }),
    ...(root === undefined ? {} : { root }),
  });
  return { render, written };
}

/** The options `composeSheet` takes, out of a bag holding both kinds. */
function composeHalf(options) {
  const { seed, theme, layout, brand, ...rest } = options;
  void rest;
  return {
    ...(seed === undefined ? {} : { seed }),
    ...(theme === undefined ? {} : { theme }),
    ...(layout === undefined ? {} : { layout }),
    ...(brand === undefined ? {} : { brand }),
  };
}

/** The rest of that bag, which `renderOf` checks for itself. */
function renderHalf(options) {
  const { seed, theme, layout, brand, ...rest } = options;
  void [seed, theme, layout, brand];
  return rest;
}
