import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Usage: node pixelate.js <input> <output> <width> <height> <pixelSize>
const args = process.argv.slice(2);

if (args.length < 5) {
    console.error('Usage: node pixelate.js <input> <output> <width> <height> <pixelSize>');
    console.error('Example: node pixelate.js input.png output.png 32 32 1  (Creates a 32x32 sprite)');
    console.error('Example: node pixelate.js input.png output.png 320 320 10 (Creates a 320x320 image looking like 32x32)');
    process.exit(1);
}

const [inputFileRel, outputFileRel, widthStr, heightStr, pixelSizeStr] = args;

const width = parseInt(widthStr, 10);
const height = parseInt(heightStr, 10);
const pixelSize = parseInt(pixelSizeStr, 10);

if (isNaN(width) || isNaN(height) || isNaN(pixelSize) || pixelSize < 1) {
    console.error('Error: Width, Height, and PixelSize must be valid positive integers.');
    process.exit(1);
}

const inputFile = path.resolve(process.cwd(), inputFileRel);
const outputFile = path.resolve(process.cwd(), outputFileRel);

// Calculate the internal resolution (the "pixelated" grid size)
const internalWidth = Math.floor(width / pixelSize);
const internalHeight = Math.floor(height / pixelSize);

console.log(`Processing:`);
console.log(`  Input: ${inputFile}`);
console.log(`  Output: ${outputFile}`);
console.log(`  Final Size: ${width}x${height}`);
console.log(`  Pixel Size: ${pixelSize} (Internal Grid: ${internalWidth}x${internalHeight})`);

// Magick Command:
// 1. -resize to internal resolution (downsampling to create the pixels)
// 2. -scale to final resolution (upsampling with Nearest Neighbor to preserve crisp edges)
// Note: -scale in ImageMagick implies box filter/nearest neighbor automatically.
const cmd = `magick "${inputFile}" -resize ${internalWidth}x${internalHeight}! -scale ${width}x${height}! "${outputFile}"`;

try {
    execSync(cmd, { stdio: 'inherit' });
    console.log('✅ Success!');
} catch (error) {
    console.error('❌ Failed to process image.');
    process.exit(1);
}
