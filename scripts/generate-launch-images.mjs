import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateKieImage } from "./kie-image.mjs";

const force = process.argv.includes("--force");
const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

const style =
  "Premium editorial bitmap image, cinematic lighting, realistic objects with subtle abstract data visualization, deep charcoal setting with teal and warm-gold accents. No text, no words, no letters, no numbers, no logos, no watermarks, no recognizable faces, no recognizable brand symbols.";

const images = [
  {
    outPath: "public/images/screenodds-og.png",
    prompt:
      "Hero image for ScreenOdds, an entertainment prediction-market research website. A refined market desk made from cinema ticket stubs, blank award envelopes, streaming remote controls, theatre light strips, and translucent probability curves in the air. First-viewport hero composition with negative space on the left third. " +
      style,
  },
  {
    outPath: "public/images/movies-hero.png",
    prompt:
      "Editorial image for movie prediction markets. A spy-film casting board with blank silhouette portrait cards, a film slate, reels, studio notes, and soft probability arcs projected across a dark cinema workspace. " +
      style,
  },
  {
    outPath: "public/images/box-office-hero.png",
    prompt:
      "Editorial image for box office prediction markets. A movie theater ticket counter after hours with ticket stacks, seat rows, popcorn buckets without branding, and a glowing abstract revenue chart made of marquee lights. " +
      style,
  },
  {
    outPath: "public/images/awards-hero.png",
    prompt:
      "Editorial image for awards prediction markets. Sealed blank award envelopes, generic trophy silhouettes, red-carpet light reflections, nominee cards with no writing, and elegant probability curves on a dark awards-season table. " +
      style,
  },
  {
    outPath: "public/images/best-picture-hero.png",
    prompt:
      "Editorial image for Best Picture odds. A quiet festival screening room with blank nominee placards, film canisters, award envelopes, and market-implied probability arcs hovering above the seats. " +
      style,
  },
  {
    outPath: "public/images/tv-hero.png",
    prompt:
      "Editorial image for TV and streaming prediction markets. A living room and production monitor wall with abstract streaming tiles, no visible logos, release-calendar objects, and subtle market signal charts in light. " +
      style,
  },
  {
    outPath: "public/images/reality-tv-hero.png",
    prompt:
      "Editorial image for reality TV prediction markets. A studio control room with voting lights, contestant silhouettes seen from behind, camera monitors with abstract scenes, and probability bars made of colored stage light. " +
      style,
  },
];

for (const image of images) {
  const outPath = resolve(projectRoot, image.outPath);
  console.log(`Generating ${image.outPath}`);
  const result = await generateKieImage({
    prompt: image.prompt,
    outPath,
    aspectRatio: "16:9",
    timeoutMs: 420000,
    force,
  });

  console.log(result.skipped ? `Skipped ${image.outPath}` : `Saved ${image.outPath}`);
}
