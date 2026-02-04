import { readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve } from "path";

const config = {
  uploadResultsFile: process.argv[2],
  metadataDir: process.argv[3] || "./metadata",
};

if (!config.uploadResultsFile) {
  console.log("Update Metadata Image URLs\n");
  console.log("Updates metadata files with Arweave image URLs from upload results.\n");
  console.log("Usage: bun update-metadata.js <upload-results.json> [metadataDir]");
  console.log("\nExample: bun update-metadata.js upload-results-2026-02-03.json ./metadata");
  process.exit(0);
}

try {
  const results = JSON.parse(readFileSync(config.uploadResultsFile, "utf8"));
  const files = results.files || results.images;

  if (!files) {
    console.error("Invalid results file: missing 'files' or 'images' array");
    process.exit(1);
  }

  const urlMap = new Map();
  for (const { fileName, url } of files) {
    const name = fileName.replace(/\.[^.]+$/, "");
    urlMap.set(name, url);
  }

  const metadataFiles = readdirSync(config.metadataDir);
  let updated = 0;
  let skipped = 0;

  for (const file of metadataFiles) {
    const arweaveUrl = urlMap.get(file);
    if (!arweaveUrl) {
      console.warn(`[SKIP] No URL found for: ${file}`);
      skipped++;
      continue;
    }

    const filePath = resolve(config.metadataDir, file);
    const metadata = JSON.parse(readFileSync(filePath, "utf8"));

    if (metadata.image === arweaveUrl) {
      console.log(`[OK] ${file} (already up to date)`);
      continue;
    }

    metadata.image = arweaveUrl;
    writeFileSync(filePath, JSON.stringify(metadata, null, 2), "utf8");
    console.log(`[UPDATED] ${file}`);
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
