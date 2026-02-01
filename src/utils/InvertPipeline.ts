import Phaser from 'phaser'

export class InvertPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private cloudsData: number[] = []
  private cloudCount: number = 0

  constructor(game: Phaser.Game) {
    super({
      game,
      name: 'Invert',
      fragShader: `
        precision mediump float;

        uniform sampler2D uMainSampler;
        uniform vec2 uResolution;
        
        // Clouds: x, y, radius
        // Supports up to 60 clouds
        uniform vec3 uClouds[60]; 
        uniform int uCloudCount;

        varying vec2 outTexCoord;

        void main() {
          vec4 color = texture2D(uMainSampler, outTexCoord);
          
          vec2 pixelPos = outTexCoord * uResolution;
          
          float totalInvert = 0.0;
          
          for (int i = 0; i < 60; i++) {
            if (i >= uCloudCount) break;
            
            vec3 cloud = uClouds[i];
            // Invert Y coordinate to match WebGL coordinate system (Bottom-Left origin)
            // vs Phaser's coordinate system (Top-Left origin)
            vec2 cloudPos = vec2(cloud.x, uResolution.y - cloud.y);
            float dist = distance(pixelPos, cloudPos);
            
            // Soft smoke particle
            // smoothstep from 0 to radius gives a soft circle
            // 1.0 - ... inverts it so center is 1, edge is 0
            // Reduced radius multiplier to 1.5 so individual clouds are visible
            float influence = 1.0 - smoothstep(0.0, cloud.z * 1.5, dist);
            
            // Square the influence for a "metaball" falloff (softer edges)
            // Accumulate density (entremêlé)
            totalInvert += influence * influence;
          }
          
          vec3 invertedColor = vec3(1.0) - color.rgb;
          
          // Create layers to simulate depth
          float alpha = 0.0;
          if (totalInvert > 0.8) {
            alpha = 1.0; // Deepest layer
          } else if (totalInvert > 0.5) {
            alpha = 0.7; // Middle layer
          } else if (totalInvert > 0.2) {
            alpha = 0.4; // Outer layer
          }
          
          color.rgb = mix(color.rgb, invertedColor, clamp(alpha, 0.0, 1.0));
          
          gl_FragColor = color;
        }
      `,
    })
  }

  onPreRender() {
    this.set2f('uResolution', this.renderer.width, this.renderer.height)

    // Set uniforms safely in the render loop
    if (this.cloudCount >= 0) {
      this.set1i('uCloudCount', this.cloudCount)
    }

    if (this.cloudsData.length > 0) {
      this.set3fv('uClouds', this.cloudsData)
    }
  }

  setClouds(clouds: Array<{ x: number; y: number; radius: number }>) {
    const maxClouds = 60
    const count = Math.min(clouds.length, maxClouds)

    this.cloudCount = count
    this.cloudsData = []

    for (let i = 0; i < maxClouds; i++) {
      if (i < count) {
        this.cloudsData.push(clouds[i].x, clouds[i].y, clouds[i].radius)
      } else {
        this.cloudsData.push(0, 0, 0)
      }
    }
  }
}
