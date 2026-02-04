import { readdirSync, statSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, extname, basename } from "path";
import sharp from "sharp";

const OPTIMIZATION_CONFIG = {
  maxWidth: 2048,
  maxHeight: 2048,
  jpegQuality: 92,
  progressive: true,
  withoutEnlargement: true,
  kernel: "lanczos3",
  mozjpeg: true,
  chromaSubsampling: "4:2:0",
};

const SUPPORTED_FORMATS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];

const config = {
  inputDir: process.argv[2] || "./images",
  outputDir: process.argv[3] || "./images-optimized",
};

async function optimizeImage(imagePath) {
  try {
    const imageBuffer = await sharp(imagePath)
      .resize(OPTIMIZATION_CONFIG.maxWidth, OPTIMIZATION_CONFIG.maxHeight, {
        fit: "inside",
        withoutEnlargement: OPTIMIZATION_CONFIG.withoutEnlargement,
        kernel: OPTIMIZATION_CONFIG.kernel,
      })
      .jpeg({
        quality: OPTIMIZATION_CONFIG.jpegQuality,
        progressive: OPTIMIZATION_CONFIG.progressive,
        mozjpeg: OPTIMIZATION_CONFIG.mozjpeg,
        chromaSubsampling: OPTIMIZATION_CONFIG.chromaSubsampling,
      })
      .toBuffer();
    return imageBuffer;
  } catch (error) {
    console.error(`Error optimizing ${imagePath}:`, error.message);
    return null;
  }
}

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

async function optimizeAllImages() {
  try {
    console.log("Image Optimizer\n");
    console.log("=".repeat(60));
    console.log(`Input:  ${config.inputDir}`);
    console.log(`Output: ${config.outputDir}\n`);

    if (!existsSync(config.outputDir)) {
      mkdirSync(config.outputDir, { recursive: true });
      console.log(`Created output directory: ${config.outputDir}\n`);
    }

    const imageFiles = await getImageFiles(config.inputDir);

    if (imageFiles.length === 0) {
      console.log("No images found.");
      console.log("Supported formats:", SUPPORTED_FORMATS.join(", "));
      console.log(`\nUsage: bun optimize.js [inputDir] [outputDir]`);
      process.exit(0);
    }

    console.log(`Found ${imageFiles.length} image(s) to optimize\n`);
    console.log("=".repeat(60));

    let successCount = 0;
    let failCount = 0;
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;

    for (let i = 0; i < imageFiles.length; i++) {
      const imagePath = imageFiles[i];
      const fileName = basename(imagePath);
      const fileNameWithoutExt = fileName.replace(extname(fileName), "");
      const outputFileName = `${fileNameWithoutExt}.jpg`;
      const outputPath = join(config.outputDir, outputFileName);

      console.log(`[${i + 1}/${imageFiles.length}] ${fileName}`);

      try {
        const originalStats = statSync(imagePath);
        const originalSize = originalStats.size;
        const optimizedBuffer = await optimizeImage(imagePath);

        if (!optimizedBuffer) {
          console.log(`  Failed to optimize\n`);
          failCount++;
          continue;
        }

        const optimizedSize = optimizedBuffer.length;
        const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(2);

        writeFileSync(outputPath, optimizedBuffer);

        totalOriginalSize += originalSize;
        totalOptimizedSize += optimizedSize;

        console.log(
          `  ${(originalSize / 1024).toFixed(2)} KB -> ${(optimizedSize / 1024).toFixed(2)} KB (${savings}% saved)\n`
        );
        successCount++;
      } catch (error) {
        console.log(`  Error: ${error.message}\n`);
        failCount++;
      }
    }

    console.log("=".repeat(60));
    console.log("\nSummary:");
    console.log("-".repeat(60));
    console.log(`Total: ${imageFiles.length} | Success: ${successCount} | Failed: ${failCount}`);
    console.log(
      `Original: ${(totalOriginalSize / (1024 * 1024)).toFixed(2)} MB -> Optimized: ${(totalOptimizedSize / (1024 * 1024)).toFixed(2)} MB`
    );
    console.log(
      `Space saved: ${((1 - totalOptimizedSize / totalOriginalSize) * 100).toFixed(2)}%`
    );
    console.log(`\nOutput: ${config.outputDir}/`);
  } catch (error) {
    console.error("Error during optimization:", error);
    process.exit(1);
  }
}

optimizeAllImages();
