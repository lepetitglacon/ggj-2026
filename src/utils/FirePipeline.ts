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

            // Fire rising from bottom (uv.y near 1.0)
            
            // Perturb UV with noise for heat haze/flame movement
            // Using slightly different coords for noise to avoid artifacts
            vec2 fireUV = uv * vec2(4.0, 2.0); 
            
            // Move noise UP over time (so minus y)
            float n = fbm(fireUV + vec2(0.0, -uTime * 1.5));
            
            // Create a gradient mask that is strongest at bottom
            // uv.y 0 (top) -> 1 (bottom)
            // Fire should start around 0.5 (middle) and get strong at 1.0
            float gradient = smoothstep(0.4, 0.9, uv.y);
            
            // Combine noise and gradient
            // We want flames "fingers" pointing up
            // Noise values are 0..1. High values = flame.
            // We modulate intensity by the vertical gradient.
            float intensity = n * gradient * 1.8; // Boost intensity
            
            // Make fire more intense at the very bottom regardless of noise
            intensity += smoothstep(0.85, 1.0, uv.y) * 0.5;

            // Colors
            vec3 fireColor = vec3(0.0);
            float alpha = 0.0;

            if (intensity > 1.2) {
                 fireColor = vec3(1.0, 1.0, 1.0); // White hot
                 alpha = 0.95;
            } else if (intensity > 0.9) {
                 fireColor = vec3(1.0, 1.0, 0.2); // Yellow
                 alpha = 0.9;
            } else if (intensity > 0.6) {
                 fireColor = vec3(1.0, 0.5, 0.0); // Orange
                 alpha = 0.8;
            } else if (intensity > 0.35) {
                 fireColor = vec3(0.8, 0.1, 0.0); // Red
                 alpha = 0.6;
            }
            
            // Pixelate effect to match game style? 
            // The request said "plein de pixels jaune rouge orange blanc"
            // The shader is per-pixel so it looks smooth unless we quantize UVs.
            // Let's quantize UVs to simulate big pixels.
            
            vec2 pixelatedUV = floor(uv * uResolution / 8.0) * 8.0 / uResolution; 
            // Re-calculate noise with pixelated UVs for "pixel art" look
            
            float pn = fbm(pixelatedUV * vec2(4.0, 2.0) + vec2(0.0, -uTime * 1.5));
            float pGradient = smoothstep(0.4, 0.9, pixelatedUV.y);
            float pIntensity = pn * pGradient * 1.8 + smoothstep(0.85, 1.0, pixelatedUV.y) * 0.5;
            
            if (pIntensity > 1.2) {
                 fireColor = vec3(1.0, 1.0, 1.0);
                 alpha = 0.95;
            } else if (pIntensity > 0.9) {
                 fireColor = vec3(1.0, 1.0, 0.2);
                 alpha = 0.9;
            } else if (pIntensity > 0.6) {
                 fireColor = vec3(1.0, 0.5, 0.0);
                 alpha = 0.8;
            } else if (pIntensity > 0.35) {
                 fireColor = vec3(0.8, 0.1, 0.0);
                 alpha = 0.6;
            } else {
                 alpha = 0.0;
            }

            // Mix
            gl_FragColor = mix(color, vec4(fireColor, 1.0), alpha);
        }
      `
    })
  }

  onPreRender() {
    this.set2f('uResolution', this.renderer.width, this.renderer.height)
    this.set1f('uTime', this.game.loop.time / 1000)
  }
}
