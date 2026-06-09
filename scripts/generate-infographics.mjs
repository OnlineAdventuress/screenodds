import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateKieImage } from "./kie-image.mjs";

async function main() {
  const slug = readArg("--slug");
  const type = readArg("--type") ?? "guide";
  const count = Number(readArg("--count") ?? 2);
  const force = process.argv.includes("--force");

  if (!slug || !["guide", "news"].includes(type)) {
    throw new Error("Usage: node scripts/generate-infographics.mjs --type guide --slug best-picture-odds");
  }

  const contentPath = resolve("content", type === "guide" ? "guides" : "news", `${slug}.json`);
  const content = JSON.parse(await readFile(contentPath, "utf8"));
  const assetRoot = resolve("public", type === "guide" ? "blog" : "news", slug, "images");
  const publicRoot = `/${type === "guide" ? "blog" : "news"}/${slug}/images`;

  const outputs = [
    {
      outPath: resolve(assetRoot, "featured-og.png"),
      publicUrl: `${publicRoot}/featured-og.png`,
      alt: `${content.title} editorial market signal graphic`,
      prompt: buildPrompt(content, "featured editorial image"),
    },
    ...Array.from({ length: Math.max(0, count) }, (_, index) => ({
      outPath: resolve(assetRoot, `infographic-${index + 1}.png`),
      publicUrl: `${publicRoot}/infographic-${index + 1}.png`,
      alt: `${content.title} prediction-market infographic ${index + 1}`,
      prompt: buildPrompt(content, `inline infographic ${index + 1}`),
    })),
  ];

  for (const output of outputs) {
    await generateKieImage({
      prompt: output.prompt,
      outPath: output.outPath,
      aspectRatio: "16:9",
      timeoutMs: 420000,
      force,
    });
  }

  const metadata = outputs.map((output) => ({
    url: output.publicUrl,
    alt: output.alt,
    provider: "Kie.ai",
    promptSummary: output.prompt.slice(0, 240),
    usageNote:
      "AI-generated editorial infographic. Review for factual neutrality and absence of logos/text artifacts before publishing inline.",
  }));

  await writeFile(resolve(assetRoot, "infographics.metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);
  console.log(`Generated ${outputs.length} Kie assets for ${slug}.`);
}

function buildPrompt(content, purpose) {
  const sectionHeadings = (content.sections ?? [])
    .slice(0, 4)
    .map((section) => section.heading)
    .join("; ");

  return [
    `Create a premium editorial ${purpose} for ScreenOdds.`,
    `Topic: ${content.title}.`,
    `Category: ${content.category}.`,
    `Key ideas: ${sectionHeadings}.`,
    "Visual style: cinematic entertainment newsroom, clean probability charts, market board details, sophisticated editorial composition.",
    "No readable text, no logos, no trademarked marks, no recognizable public figures, no celebrity likenesses, no betting slips.",
  ].join(" ");
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
  await main();
}
