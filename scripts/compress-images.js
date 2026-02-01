import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const IMG_DIR = path.join(__dirname, '..', 'public', 'img', 'layers', 'top')

const files = [
  'angola.jpg',
  'UK.jpg',
  'mexique.jpg',
  'norvège.jpg',
  'US.jpg',
  'top.jpg',
  'pexels-mostafa-ft-shots-98391-11546123.jpg',
]

files.forEach((file) => {
  const inputPath = path.join(IMG_DIR, file)
  if (!fs.existsSync(inputPath)) return

  console.log(`Processing: ${file}`)
  const origSize = execSync(`du -h "${inputPath}"`, { encoding: 'utf-8' }).split('\t')[0]

  try {
    // Pixeliser (400x300) puis upscaler (800x600) avec compression JPEG qualité 5
    execSync(
      `ffmpeg -i "${inputPath}" -vf "scale=400:300:flags=neighbor,scale=800:600:flags=neighbor" -f image2 -q:v 5 "${inputPath}.tmp" -y 2>/dev/null`,
      { stdio: 'inherit' }
    )

    // Remplacer l'original
    fs.renameSync(`${inputPath}.tmp`, inputPath)

    const newSize = execSync(`du -h "${inputPath}"`, { encoding: 'utf-8' }).split('\t')[0]
    console.log(`  ✓ ${origSize} → ${newSize}\n`)
  } catch (error) {
    console.error(`  ✗ Failed\n`)
  }
})

console.log('Done!')
