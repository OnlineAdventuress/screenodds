import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

let cachedSharedEnv: Record<string, string> | null = null;

export function getServerEnv(name: string): string | undefined {
  const processValue = process.env[name];
  if (processValue) {
    return processValue;
  }

  cachedSharedEnv ??= loadSharedEnv();
  return cachedSharedEnv[name];
}

function loadSharedEnv(): Record<string, string> {
  const envPath = path.join(homedir(), "Desktop", "Shared-Sync", ".env");
  if (!existsSync(envPath)) {
    return {};
  }

  const env: Record<string, string> = {};
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim();
    env[key] = stripEnvQuotes(value);
  }

  return env;
}

function stripEnvQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
