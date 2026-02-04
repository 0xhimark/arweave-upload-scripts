# Arweave Image Uploader

Reusable scripts for optimizing and uploading images/files to Arweave via Turbo SDK.

## Setup

```bash
bun install
```

Place your Arweave wallet at `./wallet.json` or set `ARWEAVE_WALLET` env var.

## Scripts

### Estimate Upload Cost (no wallet needed)
```bash
bun scripts/estimate.js [originalDir] [optimizedDir]
bun scripts/estimate.js ./images ./images-optimized
```

### Optimize Images (optional)
```bash
bun scripts/optimize.js [inputDir] [outputDir]
bun scripts/optimize.js ./images ./images-optimized
```

Resizes images (max 2048x2048), converts to JPEG, and compresses to reduce upload costs. Edit `OPTIMIZATION_CONFIG` at top of script to adjust quality settings. Skip this if your images are already optimized.

### Upload to Arweave
```bash
bun scripts/upload.js [inputDir] [appName]
bun scripts/upload.js ./images-optimized MyApp
```

Outputs `upload-results-{timestamp}.json` with manifest ID and file URLs.

### Update Metadata with Image URLs
```bash
bun scripts/update-metadata.js <upload-results.json> [metadataDir]
bun scripts/update-metadata.js upload-results-2026-02-03.json ./metadata
```

Updates `image` field in metadata JSON files with Arweave URLs.

## Workflow

1. `bun scripts/optimize.js` - Optimize images
2. `bun scripts/estimate.js` - Compare costs
3. `bun scripts/upload.js` - Upload images to Arweave
4. `bun scripts/update-metadata.js upload-results.json ./metadata` - Update metadata with image URLs
5. `bun scripts/upload.js ./metadata MetadataUploader` - Upload metadata to Arweave

## Output Format

Upload results JSON:
```json
{
  "manifestId": "abc123...",
  "folderUrl": "https://arweave.net/abc123...",
  "uploadedAt": "2026-02-03T16:34:50.581Z",
  "totalFiles": 100,
  "files": [
    { "fileName": "1.jpg", "url": "https://arweave.net/abc123.../1.jpg", "id": "xyz..." }
  ]
}
```

## Resources

- [Turbo SDK](https://docs.ar.io/sdks/turbo-sdk/)
