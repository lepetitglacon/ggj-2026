// Defines World Locations with their real-world coordinates
// Latitude: -90 (South) to 90 (North)
// Longitude: -180 (West) to 180 (East)

export interface Location {
  name: string
  lat: number
  lon: number
}

export const locations: Location[] = [
  { name: 'États-Unis', lat: 37.1, lon: -95.7 },
  { name: 'Russie', lat: 61.5, lon: 105.3 },
  { name: 'Canada', lat: 56.1, lon: -106.3 },
  { name: 'Chine', lat: 35.9, lon: 104.2 },
  { name: 'Brésil', lat: -14.2, lon: -51.9 },
  { name: 'Mexique', lat: 23.6, lon: -102.5 },
  { name: 'Kazakhstan', lat: 48.0, lon: 66.9 },
  { name: 'Norvège', lat: 60.5, lon: 8.5 },
  { name: 'Nigeria', lat: 9.1, lon: 8.7 },
  { name: 'Qatar', lat: 25.4, lon: 51.2 },
  { name: 'Venezuela', lat: 6.4, lon: -66.6 },
  { name: 'Angola', lat: -11.2, lon: 17.9 },
  { name: 'Libye', lat: 26.3, lon: 17.2 },
  { name: 'Algérie', lat: 28.0, lon: 2.0 },
  { name: 'Royaume-Uni', lat: 55.4, lon: -3.4 },
]

// Project Lat/Lon to X/Y coordinates relative to the map image dimensions
// Assuming Equirectangular projection (Plate Carrée)
// originX, originY: The center coordinates of the map on the screen
// width, height: The displayed width and height of the map
export const projectCoordinates = (
  lat: number,
  lon: number,
  originX: number,
  originY: number,
  width: number,
  height: number
): { x: number; y: number } => {
  // Normalize Longitude to [0, 1] (Left to Right)
  // -180 => 0, 0 => 0.5, 180 => 1
  const xPercent = (lon + 180) / 360

  // Normalize Latitude to [0, 1] (Top to Bottom)
  // 90 => 0, 0 => 0.5, -90 => 1
  const yPercent = (90 - lat) / 180

  // Calculate screen position relative to the center
  // originX/Y is the CENTER of the image in Phaser
  // We need the top-left corner of the image first
  const topLeftX = originX - width / 2
  const topLeftY = originY - height / 2

  const x = topLeftX + xPercent * width
  const y = topLeftY + yPercent * height

  return { x, y }
}
