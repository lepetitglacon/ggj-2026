import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration based on src/data/dangers.ts
const dangers = [
  { id: '1', color: '#9933ff', filename: '1.png' }, // Toxique
  { id: '2', color: '#ff6600', filename: '2.png' }, // Explosion
  { id: '3', color: '#00ff00', filename: '3.png' }, // Radiation
  { id: '4', color: '#ccff00', filename: '4.png' }, // Acide
  { id: '5', color: '#ff0000', filename: '5.png' }, // Flammable
  { id: '6', color: '#00ffff', filename: '6.png' }, // Bio-hazard
];

// Paths
const INPUT_DIR = path.resolve(__dirname, '../public/img/dangers');
const OUTPUT_BASE = path.resolve(__dirname, '../public/img/dangers/processed');

// Image processing parameters
const SOURCE_YELLOW = '#FFCC00'; // Approximate yellow from original images
const FUZZ_FACTOR = '50%';       // Tolerance for color matching

console.log('Starting danger icons processing...');
console.log(`Input: ${INPUT_DIR}`);
console.log(`Output: ${OUTPUT_BASE}`);

// Ensure output base exists
if (!fs.existsSync(OUTPUT_BASE)) {
  fs.mkdirSync(OUTPUT_BASE, { recursive: true });
}

// Extract unique colors and filenames
const colors = [...new Set(dangers.map(d => d.color))];
const filenames = [...new Set(dangers.map(d => d.filename))];

colors.forEach(color => {
  // Create subfolder for this color (using hex code as name)
  const folderName = color.replace('#', '');
  const outputDir = path.join(OUTPUT_BASE, folderName);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  filenames.forEach(filename => {
    const inputFile = path.join(INPUT_DIR, filename);
    
    if (!fs.existsSync(inputFile)) {
        console.warn(`Warning: Input file not found: ${inputFile}`);
        return;
    }

    const outputFile = path.join(outputDir, filename);

    // Construct Magick command
    // 1. Replace source yellow with target danger color (on full size image)
    // 2. Resize to 32x32
    const cmd = `magick "${inputFile}" -fuzz ${FUZZ_FACTOR} -fill "${color}" -opaque "${SOURCE_YELLOW}" -resize 32x32 "${outputFile}"`;

    try {
      process.stdout.write(`Processing ${filename} to ${folderName}/${filename}... `);
      execSync(cmd);
      console.log('OK');
    } catch (error) {
      console.log('FAILED');
      console.error(`Error processing ${filename}:`);
      console.error(error.message);
    }
  });
});

console.log('All done.');
