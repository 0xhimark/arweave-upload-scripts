import { TurboFactory, ArweaveSigner } from "@ardrive/turbo-sdk";
import { existsSync, readFileSync, writeFileSync } from "fs";

const config = {
  walletPath: process.env.ARWEAVE_WALLET || "./wallet.json",
  inputDir: process.argv[2] || "./images-optimized",
  appName: process.argv[3] || "ArweaveUploader",
  contentType: process.argv[4] || "image/*",
};

async function uploadFolder() {
  try {
    if (!existsSync(config.walletPath)) {
      console.error(`Wallet file not found: ${config.walletPath}`);
      console.error(`Set ARWEAVE_WALLET env var or place wallet.json in current directory`);
      process.exit(1);
    }

    if (!existsSync(config.inputDir)) {
      if (existsSync("./images")) {
        config.inputDir = "./images";
        console.log("Optimized folder not found, using ./images\n");
      } else {
        console.error(`Directory not found: ${config.inputDir}`);
        console.error(`\nUsage: bun upload.js [inputDir] [appName] [contentType]`);
        process.exit(1);
      }
    }

    console.log("Arweave Folder Uploader\n");
    console.log("=".repeat(60));
    console.log(`Directory: ${config.inputDir}`);
    console.log(`App Name:  ${config.appName}\n`);

    const jwk = JSON.parse(readFileSync(config.walletPath, "utf8"));
    const signer = new ArweaveSigner(jwk);
    const turbo = TurboFactory.authenticated({ signer });

    const { manifest, fileResponses, manifestResponse } =
      await turbo.uploadFolder({
        folderPath: config.inputDir,
        maxConcurrentUploads: 5,
        dataItemOpts: {
          tags: [
            { name: "App-Name", value: config.appName },
            { name: "App-Version", value: "1.0.0" },
          ],
        },
        events: {
          onFileStart: ({ fileName, fileIndex, totalFiles }) => {
            console.log(`[${fileIndex + 1}/${totalFiles}] Uploading: ${fileName}`);
          },
          onFileComplete: ({ fileName, fileIndex, totalFiles, id }) => {
            console.log(`[${fileIndex + 1}/${totalFiles}] Done: ${fileName} -> ${id}`);
          },
          onFolderProgress: ({ currentPhase }) => {
            if (currentPhase === "manifest") {
              console.log("\nUploading manifest...");
            }
          },
          onFolderError: (error) => {
            console.error("Upload error:", error);
          },
        },
      });

    const manifestId = manifestResponse.id;
    const folderUrl = `https://arweave.net/${manifestId}`;

    console.log("\n" + "=".repeat(60));
    console.log("Upload Successful!\n");
    console.log(`Manifest ID: ${manifestId}`);
    console.log(`Folder URL:  ${folderUrl}`);
    console.log(`Total Files: ${fileResponses.length}\n`);

    const items = Object.entries(manifest.paths).map(([fileName, { id }]) => ({
      fileName,
      url: `${folderUrl}/${fileName}`,
      id,
    }));

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const resultsFile = `upload-results-${timestamp}.json`;

    writeFileSync(
      resultsFile,
      JSON.stringify(
        {
          manifestId,
          folderUrl,
          uploadedAt: new Date().toISOString(),
          totalFiles: fileResponses.length,
          files: items,
        },
        null,
        2
      )
    );

    console.log(`Results saved to: ${resultsFile}`);
  } catch (error) {
    console.error("Error during upload:", error);
    if (error.message?.includes("JSON")) {
      console.error("\nMake sure wallet.json is a valid Arweave wallet file");
    }
    if (error.message?.includes("insufficient")) {
      console.error("\nInsufficient balance. Add credits to your Turbo account.");
    }
    process.exit(1);
  }
}

uploadFolder();
