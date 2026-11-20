// A tiny, surgical TOML editor — NOT a general TOML parser/writer.
//
// Codex CLI's ~/.codex/config.toml is a hand-edited file full of comments
// that real users rely on. A full parse-and-re-serialize round trip (the
// usual way to "safely" edit structured config) would normalize away those
// comments and any formatting choices in tables this tool never touches.
// Since the task is "merge in, never overwrite unrelated existing config",
// this file does line-based surgery instead: it only ever rewrites the lines
// that make up the one table this tool owns, plus (at most) two top-level
// key = value lines. Everything else in the file is passed through verbatim,
// byte for byte.
//
// This is intentionally narrow: it knows about exactly the two syntactic
// shapes synap-connect needs — a `[dotted.table]` header line, and a bare
// top-level `key = value` line that appears before the first table header —
// and refuses to get clever about the rest of TOML's grammar.

/**
 * Detect whether a line is a table header, e.g. `[model_providers.synap]`.
 */
function isTableHeader(line) {
  return /^\s*\[/.test(line);
}

/**
 * Replace (or insert) the table identified by `headerLine` (e.g.
 * "[model_providers.synap]") with `bodyLines` (an array of "key = value"
 * strings, not including the header). If the table already exists anywhere
 * in the file, its header plus every line up to the next table header (or
 * EOF) is replaced. Otherwise the table is appended at the end of the file.
 *
 * `leadingComment`, if given, is a block of `# ...` comment lines (joined by
 * "\n", no trailing newline) written immediately above the header. On a
 * re-run, any contiguous `#`-comment lines directly above an existing
 * matching header are swallowed along with it, so re-running this function
 * updates the comment in place instead of duplicating it on every run.
 */
export function upsertTable(text, headerLine, bodyLines, { leadingComment = null } = {}) {
  const lines = text.length ? text.split("\n") : [];
  const headerIndex = lines.findIndex((l) => l.trim() === headerLine.trim());

  const commentLines = leadingComment ? leadingComment.split("\n") : [];
  const newBlock = [...commentLines, headerLine, ...bodyLines];

  if (headerIndex === -1) {
    const needsLeadingBlank = lines.length > 0 && lines[lines.length - 1].trim() !== "";
    const out = [...lines];
    if (needsLeadingBlank) out.push("");
    out.push(...newBlock);
    return out.join("\n").replace(/\n*$/, "\n");
  }

  // Swallow a contiguous block of comment lines directly above the header so
  // re-running this function replaces our own comment instead of stacking it.
  let startIndex = headerIndex;
  while (startIndex > 0 && /^\s*#/.test(lines[startIndex - 1])) {
    startIndex--;
  }

  let endIndex = headerIndex + 1;
  while (endIndex < lines.length && !isTableHeader(lines[endIndex])) {
    endIndex++;
  }
  // Trim trailing blank lines inside the old block so we don't accumulate
  // blank lines on repeated runs, but keep exactly one separating blank
  // line before whatever comes next (if anything follows).
  let trimmedEnd = endIndex;
  while (trimmedEnd > headerIndex + 1 && lines[trimmedEnd - 1].trim() === "") {
    trimmedEnd--;
  }
  const hasFollowing = endIndex < lines.length;
  const before = lines.slice(0, startIndex);
  const after = lines.slice(endIndex);
  const out = [...before, ...newBlock];
  if (hasFollowing) out.push("");
  out.push(...after);
  return out.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\n*$/, "\n");
}

/**
 * Set a bare top-level `key = value` pair (a line that appears before the
 * first `[table]` header in the file). If the key already has a top-level
 * assignment, that line is replaced in place. Otherwise the assignment is
 * inserted at the very top of the file, which is always valid TOML since
 * top-level keys may appear anywhere before the first table header.
 *
 * `value` is written as given (callers are responsible for quoting strings).
 */
export function upsertTopLevelKey(text, key, value) {
  const lines = text.length ? text.split("\n") : [];
  let preambleEnd = lines.findIndex((l) => isTableHeader(l));
  if (preambleEnd === -1) preambleEnd = lines.length;

  const keyRe = new RegExp(`^\\s*${key}\\s*=`);
  const existingIndex = lines.slice(0, preambleEnd).findIndex((l) => keyRe.test(l) && !/^\s*#/.test(l));

  const newLine = `${key} = ${value}`;
  if (existingIndex !== -1) {
    const out = [...lines];
    out[existingIndex] = newLine;
    return out.join("\n");
  }

  const out = [newLine, ...lines];
  return out.join("\n");
}

/** True if the given exact table header line exists anywhere in the file. */
export function hasTable(text, headerLine) {
  if (!text) return false;
  return text.split("\n").some((l) => l.trim() === headerLine.trim());
}

/** Read a top-level `key = "value"` assignment's raw value, or null. */
export function readTopLevelKey(text, key) {
  if (!text) return null;
  const lines = text.split("\n");
  let preambleEnd = lines.findIndex((l) => isTableHeader(l));
  if (preambleEnd === -1) preambleEnd = lines.length;
  const keyRe = new RegExp(`^\\s*${key}\\s*=\\s*(.+)\\s*$`);
  for (const line of lines.slice(0, preambleEnd)) {
    if (/^\s*#/.test(line)) continue;
    const m = line.match(keyRe);
    if (m) return m[1].trim();
  }
  return null;
}
