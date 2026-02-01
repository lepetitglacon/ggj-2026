import Phaser from 'phaser'

export class FirePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game: Phaser.Game) {
    super({
      game,
      name: 'Fire',
      fragShader: `
        precision mediump float;

        uniform sampler2D uMainSampler;
        uniform vec2 uResolution;
        uniform float uTime;
        uniform float uIntensity;

        varying vec2 outTexCoord;

        // Simple pseudo-random
        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        // 2D Noise
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

        // FBM (Fractal Brownian Motion) for detail
        float fbm(vec2 p) {
            float v = 0.0;
            float amp = 0.5;
            for (int i = 0; i < 4; i++) {
                v += amp * noise(p);
                p *= 2.0;
                amp *= 0.5;
            }
            return v;
        }

        void main() {
            vec4 color = texture2D(uMainSampler, outTexCoord);
            vec2 uv = outTexCoord;

            // Pixelate effect to match game style
            vec2 pixelatedUV = floor(uv * uResolution / 8.0) * 8.0 / uResolution; 
            
            // Fire rising from bottom (uv.y near 1.0)
            vec2 fireUV = pixelatedUV * vec2(4.0, 2.0); 
            
            // Move noise UP over time
            float n = fbm(fireUV + vec2(0.0, -uTime * 1.5));
            
            // Create a gradient mask that is strongest at bottom
            float gradient = smoothstep(0.4, 0.9, pixelatedUV.y);
            
            // Combine noise and gradient
            float intensity = n * gradient * 1.8; 
            
            // Make fire more intense at the very bottom
            intensity += smoothstep(0.85, 1.0, pixelatedUV.y) * 0.5;

            // Colors
            vec3 fireColor = vec3(0.0);
            float alpha = 0.0;

            if (intensity > 1.2) {
                 fireColor = vec3(1.0, 1.0, 1.0);
                 alpha = 0.95;
            } else if (intensity > 0.9) {
                 fireColor = vec3(1.0, 1.0, 0.2);
                 alpha = 0.9;
            } else if (intensity > 0.6) {
                 fireColor = vec3(1.0, 0.5, 0.0);
                 alpha = 0.8;
            } else if (intensity > 0.35) {
                 fireColor = vec3(0.8, 0.1, 0.0);
                 alpha = 0.6;
            }

            // Mix
            gl_FragColor = mix(color, vec4(fireColor, 1.0), alpha * uIntensity);
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