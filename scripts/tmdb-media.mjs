import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { downloadImage, loadEnv } from "./kie-image.mjs";

const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original";

async function main() {
  const type = readArg("--type") ?? "movie";
  const query = readArg("--query");
  const slug = readArg("--slug");
  const imageKind = readArg("--image") ?? defaultImageKind(type);

  if (!["movie", "tv", "person"].includes(type)) {
    throw new Error("--type must be movie, tv, or person.");
  }
  if (!query || !slug) {
    throw new Error("Usage: node scripts/tmdb-media.mjs --type movie --query \"Title\" --slug title-slug");
  }

  const env = await loadEnv();
  const tmdbCredential = env.TMDB_API_READ_TOKEN ?? env.TMDB_API_KEY;
  if (!tmdbCredential) {
    throw new Error("TMDB_API_KEY is not set. Add it before automating real movie/show/person media.");
  }

  const result = await searchTmdb({ type, query, credential: tmdbCredential });
  const imagePath = pickImagePath(result, imageKind);
  if (!imagePath) {
    throw new Error(`TMDb result did not include a ${imageKind} image for ${query}.`);
  }

  const outDir = resolve("public", "media", type, slug);
  const outPath = resolve(outDir, `${imageKind}.jpg`);
  const publicUrl = `/media/${type}/${slug}/${imageKind}.jpg`;
  const sourceUrl = buildTmdbSourceUrl(type, result.id);

  await downloadImage(`${TMDB_IMAGE_BASE}${imagePath}`, outPath);
  await writeJson(resolve(outDir, `${imageKind}.metadata.json`), {
    kind: "real",
    url: publicUrl,
    alt: buildAlt(type, result),
    provider: "TMDb",
    sourceUrl,
    credit: "Image and metadata provided by TMDb. ScreenOdds uses TMDb assets with attribution.",
    usageNote:
      "TMDb media asset. Verify page context and attribution before attaching to published ScreenOdds content.",
    tmdbId: result.id,
    tmdbMediaType: type,
    originalImagePath: imagePath,
  });

  console.log(`Downloaded ${publicUrl}`);
}

export async function searchTmdb({ type, query, credential }) {
  const url = new URL(`${TMDB_API_BASE}/search/${type}`);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", "1");

  const headers = { accept: "application/json" };
  if (credential.startsWith("ey")) {
    headers.Authorization = `Bearer ${credential}`;
  } else {
    url.searchParams.set("api_key", credential);
  }

  const response = await fetch(url, { headers });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`TMDb search failed: ${JSON.stringify(json).slice(0, 300)}`);
  }

  const result = json.results?.[0];
  if (!result) {
    throw new Error(`No TMDb result found for ${query}.`);
  }

  return result;
}

function pickImagePath(result, imageKind) {
  if (imageKind === "poster") {
    return result.poster_path;
  }
  if (imageKind === "backdrop") {
    return result.backdrop_path;
  }
  if (imageKind === "profile") {
    return result.profile_path;
  }
  throw new Error("--image must be poster, backdrop, or profile.");
}

function buildTmdbSourceUrl(type, id) {
  if (type === "movie") {
    return `https://www.themoviedb.org/movie/${id}`;
  }
  if (type === "tv") {
    return `https://www.themoviedb.org/tv/${id}`;
  }
  return `https://www.themoviedb.org/person/${id}`;
}

function buildAlt(type, result) {
  if (type === "person") {
    return `${result.name} TMDb profile image`;
  }
  return `${result.title ?? result.name} TMDb ${type} image`;
}

function defaultImageKind(type) {
  return type === "person" ? "profile" : "poster";
}

function readArg(name) {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) {
    return inline.slice(name.length + 1);
  }

  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function writeJson(outPath, payload) {
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
