import { TurboFactory } from "@ardrive/turbo-sdk";
import { readdirSync, statSync, existsSync } from "fs";
import { join, extname } from "path";

const SUPPORTED_FORMATS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];

const config = {
  originalDir: process.argv[2] || "./images",
  optimizedDir: process.argv[3] || "./images-optimized",
};

async function getImageFiles(directory) {
  try {
    const files = readdirSync(directory);
    return files
      .filter((file) => SUPPORTED_FORMATS.includes(extname(file).toLowerCase()))
      .map((file) => join(directory, file));
  } catch (error) {
    console.error("Error reading directory:", error.message);
    return [];
  }
}

async function calculateTotalSize(imageFiles) {
  let totalBytes = 0;
  for (const imagePath of imageFiles) {
    const stats = statSync(imagePath);
    totalBytes += stats.size;
  }
  return totalBytes;
}

async function estimateUploadCost() {
  try {
    console.log("Arweave Upload Cost Estimator\n");
    console.log("=".repeat(60));
    console.log("Note: No private key required for cost estimation!\n");

    const turbo = TurboFactory.unauthenticated();

    console.log(`Scanning original images: ${config.originalDir}/\n`);
    const originalFiles = await getImageFiles(config.originalDir);

    if (originalFiles.length === 0) {
      console.log("No images found in original directory.");
      console.log("Supported formats:", SUPPORTED_FORMATS.join(", "));
      console.log(`\nUsage: bun estimate.js [originalDir] [optimizedDir]`);
      process.exit(0);
    }

    console.log(`Found ${originalFiles.length} original image(s)`);
    const originalTotalBytes = await calculateTotalSize(originalFiles);
    console.log(
      `Total size: ${(originalTotalBytes / 1024).toFixed(2)} KB (${(originalTotalBytes / (1024 * 1024)).toFixed(2)} MB)\n`
    );

    let optimizedFiles = [];
    let optimizedTotalBytes = 0;
    let hasOptimized = false;

    if (existsSync(config.optimizedDir)) {
      console.log(`Scanning optimized images: ${config.optimizedDir}/\n`);
      optimizedFiles = await getImageFiles(config.optimizedDir);

      if (optimizedFiles.length > 0) {
        hasOptimized = true;
        console.log(`Found ${optimizedFiles.length} optimized image(s)`);
        optimizedTotalBytes = await calculateTotalSize(optimizedFiles);
        console.log(
          `Total size: ${(optimizedTotalBytes / 1024).toFixed(2)} KB (${(optimizedTotalBytes / (1024 * 1024)).toFixed(2)} MB)\n`
        );
      }
    }

    console.log("=".repeat(60));
    console.log("Fetching upload cost estimates...\n");

    const [originalCost] = await turbo.getUploadCosts({
      bytes: [originalTotalBytes],
    });

    const originalWinc = originalCost.winc.toString();
    const originalCredits = (parseInt(originalWinc) / 1e12).toFixed(6);

    console.log("ORIGINAL Images Upload Cost:");
    console.log("-".repeat(60));
    console.log(`Data size: ${originalTotalBytes.toLocaleString()} bytes`);
    console.log(`Cost in winc: ${parseInt(originalWinc).toLocaleString()}`);
    console.log(`Cost in Credits: ${originalCredits}`);

    if (hasOptimized) {
      const [optimizedCost] = await turbo.getUploadCosts({
        bytes: [optimizedTotalBytes],
      });

      const optimizedWinc = optimizedCost.winc.toString();
      const optimizedCredits = (parseInt(optimizedWinc) / 1e12).toFixed(6);

      console.log("\nOPTIMIZED Images Upload Cost:");
      console.log("-".repeat(60));
      console.log(`Data size: ${optimizedTotalBytes.toLocaleString()} bytes`);
      console.log(`Cost in winc: ${parseInt(optimizedWinc).toLocaleString()}`);
      console.log(`Cost in Credits: ${optimizedCredits}`);

      console.log("\n" + "=".repeat(60));
      console.log("SAVINGS COMPARISON");
      console.log("=".repeat(60));

      const sizeSavingsPercent = (
        (1 - optimizedTotalBytes / originalTotalBytes) *
        100
      ).toFixed(2);
      const costSavingsCredits = (
        parseFloat(originalCredits) - parseFloat(optimizedCredits)
      ).toFixed(6);

      console.log(`\nSize reduction: ${sizeSavingsPercent}%`);
      console.log(
        `  Original: ${(originalTotalBytes / (1024 * 1024)).toFixed(2)} MB`
      );
      console.log(
        `  Optimized: ${(optimizedTotalBytes / (1024 * 1024)).toFixed(2)} MB`
      );
      console.log(`\nCost savings: ${costSavingsCredits} Credits`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("\nNext steps:");
    if (!hasOptimized) {
      console.log("  1. Run: bun optimize.js (to create optimized images)");
      console.log("  2. Run: bun estimate.js (to compare costs)");
    }
    console.log("  3. Run: bun upload.js (to upload images)");
  } catch (error) {
    console.error("Error estimating upload cost:", error);
    process.exit(1);
  }
}

estimateUploadCost();
