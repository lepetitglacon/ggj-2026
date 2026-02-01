import Phaser from 'phaser'

export class BeamPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game: Phaser.Game) {
    super({
      game,
      name: 'Beam',
      fragShader: `
        precision mediump float;

        uniform sampler2D uMainSampler;
        uniform vec2 uResolution;
        uniform float uTime;
        uniform float uIntensity;

        varying vec2 outTexCoord;

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
            vec4 color = texture2D(uMainSampler, outTexCoord);
            vec2 uv = outTexCoord;

            // Pixelate UVs
            vec2 pixelatedUV = floor(uv * uResolution / 8.0) * 8.0 / uResolution;

            // Central column
            float center = 0.5;
            
            // Noise that pushes sides (affects width and position)
            // Increased frequency and amplitude for "pushing" effect
            float n = noise(vec2(pixelatedUV.y * 4.0, uTime * 6.0));
            float horizontalOffset = (n - 0.5) * 0.1; // Wider wobble
            
            // Width pulses and "pushes" out
            float beamWidth = 0.04 + pow(n, 2.0) * 0.2; 
            
            float dist = abs(pixelatedUV.x - (center + horizontalOffset));
            
            // Intensity based on proximity to center and vertical gradient
            // Only from bottom up to a certain point
            float verticalMask = smoothstep(0.0, 0.8, pixelatedUV.y);
            float intensity = smoothstep(beamWidth, 0.0, dist) * verticalMask;

            if (intensity > 0.1) {
                // Mix between Yellow (edges/low intensity) and White (center/high intensity)
                vec3 edgeColor = vec3(1.0, 0.9, 0.0); // Yellow
                vec3 centerColor = vec3(1.0, 1.0, 1.0); // White
                
                vec3 beamColor = mix(edgeColor, centerColor, smoothstep(0.2, 0.8, intensity));
                
                gl_FragColor = mix(color, vec4(beamColor, 1.0), clamp(intensity * 1.5, 0.0, 1.0) * uIntensity);
            } else {
                gl_FragColor = color;
            }
        }
      `
    })
  }

  private intensity: number = 1.0

  setIntensity(value: number) {
    this.intensity = Phaser.Math.Clamp(value, 0, 1)
  }

  onPreRender() {
    this.set2f('uResolution', this.renderer.width, this.renderer.height)
    this.set1f('uTime', this.game.loop.time / 1000)
    this.set1f('uIntensity', this.intensity)
  }
}
