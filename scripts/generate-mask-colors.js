#!/usr/bin/env node

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dangers avec leurs IDs et couleurs hexadécimales
const dangers = [
  { id: '1', name: 'toxique', color: '#9933FF' },
  { id: '2', name: 'explosion', color: '#FF6600' },
  { id: '3', name: 'radiation', color: '#00FF00' },
  { id: '4', name: 'acide', color: '#CCFF00' },
  { id: '5', name: 'flammable', color: '#FF0000' }, // Source image (rouge)
  { id: '6', name: 'biohazard', color: '#00FFFF' },
];

const maskDir = path.join(__dirname, '../public/img/masks');
const sourceImage = path.join(maskDir, 'mask-flammable.png');
const sourceDrillerImage = path.join(maskDir, 'mask-driller-flammable.png');

// Fonction pour remplacer une couleur dans une image
async function replaceColor(inputPath, outputPath, fromColor, toColor) {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    // Créer un buffer raw pour accéder aux pixels
    const { data, info } = await sharp(inputPath)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Couleurs en RGB (sans le #)
    const from = {
      r: parseInt(fromColor.slice(1, 3), 16),
      g: parseInt(fromColor.slice(3, 5), 16),
      b: parseInt(fromColor.slice(5, 7), 16),
    };

    const to = {
      r: parseInt(toColor.slice(1, 3), 16),
      g: parseInt(toColor.slice(3, 5), 16),
      b: parseInt(toColor.slice(5, 7), 16),
    };

    // Parcourir les pixels et remplacer la couleur
    // Chaque pixel est 4 bytes: RGBA
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Vérifier si la couleur est proche du rouge (avec tolérance)
      const tolerance = 100;
      if (
        Math.abs(r - from.r) < tolerance &&
        Math.abs(g - from.g) < tolerance &&
        Math.abs(b - from.b) < tolerance
      ) {
        // Remplacer par la nouvelle couleur
        data[i] = to.r;
        data[i + 1] = to.g;
        data[i + 2] = to.b;
        // Garder l'alpha
      }
    }

    // Créer la nouvelle image
    await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels,
      },
    })
      .toFile(outputPath);

    console.log(`✓ Généré: ${outputPath}`);
  } catch (error) {
    console.error(`✗ Erreur pour ${outputPath}:`, error.message);
  }
}

// Générer les images pour tous les dangers
async function generateAllMasks() {
  console.log('Génération des images de masques avec couleurs...\n');

  // Vérifier que les fichiers source existent
  if (!fs.existsSync(sourceImage)) {
    console.error(`✗ Fichier source introuvable: ${sourceImage}`);
    process.exit(1);
  }

  const sourceFlammable = dangers.find((d) => d.id === '5');

  for (const danger of dangers) {
    // Ne pas régénérer flammable (c'est la source)
    if (danger.id === '5') {
      console.log(`⊘ Masque source (flammable) - pas de modification`);
      continue;
    }

    const outputPath = path.join(maskDir, `mask-${danger.name}.png`);
    await replaceColor(sourceImage, outputPath, sourceFlammable.color, danger.color);
  }

  // Faire la même chose pour les masques du driller
  console.log('\nGénération des masques driller...\n');

  if (!fs.existsSync(sourceDrillerImage)) {
    console.warn(`⚠ Fichier driller source introuvable: ${sourceDrillerImage}`);
    console.log('Passer les masques driller...\n');
  } else {
    for (const danger of dangers) {
      if (danger.id === '5') {
        console.log(`⊘ Masque driller source (flammable) - pas de modification`);
        continue;
      }

      const outputPath = path.join(maskDir, `mask-driller-${danger.name}.png`);
      await replaceColor(sourceDrillerImage, outputPath, sourceFlammable.color, danger.color);
    }
  }

  console.log('\n✓ Génération terminée!');
}

generateAllMasks().catch((error) => {
  console.error('Erreur:', error);
  process.exit(1);
});
