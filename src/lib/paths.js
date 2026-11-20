import os from "node:os";
import path from "node:path";

/**
 * Centralizes "where does this tool's config live" so tests can override
 * HOME and get a throwaway fake filesystem instead of touching real dotfiles.
 */
export function homeDir(env = process.env) {
  return env.SYNAP_CONNECT_HOME || os.homedir();
}

export function codexConfigPath(env = process.env) {
  return path.join(homeDir(env), ".codex", "config.toml");
}

export function codexDir(env = process.env) {
  return path.join(homeDir(env), ".codex");
}

export function opencodeConfigPath(env = process.env) {
  const xdgConfig = env.XDG_CONFIG_HOME || path.join(homeDir(env), ".config");
  return path.join(xdgConfig, "opencode", "opencode.json");
}

export function opencodeDir(env = process.env) {
  const xdgConfig = env.XDG_CONFIG_HOME || path.join(homeDir(env), ".config");
  return path.join(xdgConfig, "opencode");
}

export function claudeCodeDir(env = process.env) {
  return path.join(homeDir(env), ".claude");
}

export function cursorConfigDirs(env = process.env) {
  const home = homeDir(env);
  const plat = env.SYNAP_CONNECT_PLATFORM || process.platform;
  if (plat === "darwin") {
    return [path.join(home, "Library", "Application Support", "Cursor")];
  }
  // Linux and other unix-likes
  return [path.join(home, ".config", "Cursor")];
}
