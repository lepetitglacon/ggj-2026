#!/bin/bash

IMG_DIR="public/img/layers/top"
SCRIPT_PATH="scripts/scripts/pixelate.js"

# Liste des fichiers à traiter
FILES=(
  "angola.jpg"
  "UK.jpg"
  "mexique.jpg"
  "norvège.jpg"
  "US.jpg"
  "top.jpg"
  "pexels-mostafa-ft-shots-98391-11546123.jpg"
)

for file in "${FILES[@]}"; do
  INPUT="$IMG_DIR/$file"
  TEMP="$IMG_DIR/temp_pixelated.jpg"
  
  if [ -f "$INPUT" ]; then
    echo "Processing: $file"
    ORIG_SIZE=$(du -h "$INPUT" | cut -f1)
    
    # 1. Pixeliser
    echo "  - Pixelating..."
    node "$SCRIPT_PATH" "$INPUT" "$TEMP" 800 600 2
    
    # 2. Compresser en JPEG qualité 60 avec ffmpeg
    echo "  - Compressing..."
    ffmpeg -i "$TEMP" -q:v 6 "$INPUT" -y 2>/dev/null
    
    # Nettoyer
    rm "$TEMP" 2>/dev/null
    
    # Afficher les tailles
    NEW_SIZE=$(du -h "$INPUT" | cut -f1)
    echo "  ✓ ${ORIG_SIZE} → ${NEW_SIZE}"
    echo ""
  fi
done

echo "Done!"
