import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const CREATE_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const POLL_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";
const DEFAULT_ENV_PATH = resolve(homedir(), "Desktop", "Shared-Sync", ".env");

export async function loadEnv(envPath = DEFAULT_ENV_PATH) {
  const env = { ...process.env };

  try {
    const contents = await readFile(envPath, "utf8");
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) {
        continue;
      }

      const [key, ...valueParts] = line.split("=");
      const value = valueParts.join("=").trim().replace(/^['"]|['"]$/g, "");
      env[key.trim()] ??= value;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  return env;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON response, received: ${text.slice(0, 160)}`);
  }
}

function extractResultUrls(resultJson) {
  if (!resultJson) {
    return [];
  }

  const parsed = typeof resultJson === "string" ? JSON.parse(resultJson) : resultJson;

  return (
    parsed.resultUrls ??
    parsed.result_urls ??
    parsed.imageUrls ??
    parsed.images ??
    []
  ).filter(Boolean);
}

export async function generateKieImage({
  prompt,
  outPath,
  aspectRatio = "16:9",
  timeoutMs = 240000,
  pollIntervalMs = 2500,
  force = false,
}) {
  if (!prompt || !outPath) {
    throw new Error("generateKieImage requires prompt and outPath");
  }

  if (!force) {
    try {
      const existing = await stat(outPath);
      if (existing.size > 0) {
        return { outPath, skipped: true };
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }

  const env = await loadEnv();
  const apiKey = env.KIE_API_KEY;

  if (!apiKey) {
    throw new Error("KIE_API_KEY is not set in process env or Shared-Sync .env");
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const createResponse = await fetchWithTimeout(
    CREATE_URL,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "gpt-image-2-text-to-image",
        input: {
          prompt,
          aspect_ratio: aspectRatio,
        },
      }),
    },
    30000,
  );

  if (!createResponse.ok) {
    throw new Error(`Kie createTask failed with HTTP ${createResponse.status}`);
  }

  const createJson = await readJson(createResponse);
  if (createJson.code !== 200 || !createJson.data?.taskId) {
    throw new Error(`Kie createTask returned an unexpected payload: ${JSON.stringify(createJson)}`);
  }

  const taskId = createJson.data.taskId;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((resolveTimer) => setTimeout(resolveTimer, pollIntervalMs));

    const pollResponse = await fetchWithTimeout(
      `${POLL_URL}?taskId=${encodeURIComponent(taskId)}`,
      { headers },
      30000,
    );

    if (!pollResponse.ok) {
      throw new Error(`Kie recordInfo failed with HTTP ${pollResponse.status}`);
    }

    const pollJson = await readJson(pollResponse);
    if (pollJson.code !== 200) {
      throw new Error(`Kie recordInfo returned an unexpected payload: ${JSON.stringify(pollJson)}`);
    }

    const state = pollJson.data?.state ?? pollJson.data?.status;
    if (state === "success") {
      const urls = extractResultUrls(pollJson.data?.resultJson);
      if (urls.length === 0) {
        throw new Error("Kie completed but did not return an image URL");
      }

      await downloadImage(urls[0], outPath);
      return { outPath, imageUrl: urls[0], skipped: false };
    }

    if (["fail", "failed", "error"].includes(state)) {
      throw new Error(`Kie image task failed: ${JSON.stringify(pollJson.data)}`);
    }
  }

  throw new Error(`Kie image task timed out after ${timeoutMs}ms`);
}

export async function downloadImage(url, outPath) {
  const response = await fetchWithTimeout(url, {}, 60000);

  if (!response.ok) {
    throw new Error(`Image download failed with HTTP ${response.status}`);
  }

  await mkdir(dirname(outPath), { recursive: true });
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(outPath, bytes);
}

function readArg(name) {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) {
    return inline.slice(name.length + 1);
  }

  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const prompt = readArg("--prompt");
  const outPath = readArg("--out");
  const aspectRatio = readArg("--aspect") ?? "16:9";
  const force = process.argv.includes("--force");

  const result = await generateKieImage({
    prompt,
    outPath: resolve(outPath),
    aspectRatio,
    force,
  });

  console.log(result.skipped ? `Skipped ${result.outPath}` : `Generated ${result.outPath}`);
}
