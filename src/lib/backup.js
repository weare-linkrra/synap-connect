import fs from "node:fs";
import path from "node:path";

/**
 * If `filePath` exists, copy it to `<filePath>.bak-<unix-seconds>` before any
 * write touches it. Returns the backup path, or null if there was nothing to
 * back up (file didn't exist yet).
 */
export function backupIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const stamp = Math.floor(Date.now() / 1000);
  const backupPath = `${filePath}.bak-${stamp}`;
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

export function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
}

export function writeFile(filePath, contents) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, contents, "utf8");
}
