import { loadEnv } from "./kie-image.mjs";

const checks = [
  ["TMDb", checkTmdb],
  ["OMDb", checkOmdb],
  ["TVmaze", checkTvmaze],
];

async function main() {
  const env = await loadEnv();
  const results = [];

  for (const [name, check] of checks) {
    try {
      results.push({ name, ...(await check(env)) });
    } catch (error) {
      results.push({
        name,
        ok: false,
        detail: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  for (const result of results) {
    console.log(`${result.name}: ${result.ok ? "ok" : "failed"} - ${result.detail}`);
  }

  if (results.some((result) => !result.ok)) {
    process.exitCode = 1;
  }
}

async function checkTmdb(env) {
  const credentials = uniqueValues([env.TMDB_API_READ_TOKEN, env.TMDB_API_KEY]);
  if (credentials.length === 0) {
    return { ok: false, detail: "TMDB_API_READ_TOKEN or TMDB_API_KEY is missing" };
  }

  for (const credential of credentials) {
    const url = new URL("https://api.themoviedb.org/3/search/movie");
    url.searchParams.set("query", "Scary Movie");
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
    if (!response.ok) {
      continue;
    }

    const json = await response.json();
    if (json.results?.[0]?.id) {
      return { ok: true, detail: `matched ${json.results[0].title ?? "Scary Movie"}` };
    }
  }

  return { ok: false, detail: "no valid TMDb credential returned a movie match" };
}

async function checkOmdb(env) {
  if (!env.OMDB_API_KEY) {
    return { ok: false, detail: "OMDB_API_KEY is missing" };
  }

  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("t", "Scary Movie");
  url.searchParams.set("apikey", env.OMDB_API_KEY);

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    return { ok: false, detail: `HTTP ${response.status}` };
  }

  const json = await response.json();
  return json.Response === "True"
    ? { ok: true, detail: `matched ${json.Title ?? "Scary Movie"}` }
    : { ok: false, detail: "OMDb did not return a title match" };
}

async function checkTvmaze(env) {
  if (!env.TVMAZE_API_KEY) {
    return { ok: false, detail: "TVMAZE_API_KEY is missing" };
  }

  const url = new URL("https://api.tvmaze.com/singlesearch/shows");
  url.searchParams.set("q", "Big Brother");

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    return { ok: false, detail: `HTTP ${response.status}` };
  }

  const json = await response.json();
  return json.id
    ? { ok: true, detail: `matched ${json.name ?? "Big Brother"}` }
    : { ok: false, detail: "TVmaze did not return a show match" };
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

await main();
