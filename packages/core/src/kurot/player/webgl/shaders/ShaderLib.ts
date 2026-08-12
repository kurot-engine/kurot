/**
 * GLSL ES 1.00 shaders — used with WebGL1 context.
 * For WebGL2 (GLSL ES 3.00) shaders see ../webgl2/ShaderLib2.ts
 */
export const ShaderLib = {
	default_vert: /* glsl */ `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;
attribute vec4 aColor;
uniform vec2 projectionVector;
varying vec2 vTextureCoord;
varying vec4 vColor;
const vec2 center = vec2(-1.0, 1.0);
void main(void) {
   gl_Position = vec4((aVertexPosition / projectionVector) + center, 0.0, 1.0);
   vTextureCoord = aTextureCoord;
   vColor = aColor;
   }`,

	// Standalone vertex shader for fullscreen quad blits (filters, blur passes).
	// Identical to default_vert but kept separate so filter passes can be
	// paired with their own fragment shaders without colliding with the
	// batched-texture program cache key.
	fullscreen_vert: /* glsl */ `
   attribute vec2 aVertexPosition;
   attribute vec2 aTextureCoord;
   attribute vec4 aColor;
   uniform vec2 projectionVector;
   varying vec2 vTextureCoord;
   varying vec4 vColor;
   const vec2 center = vec2(-1.0, 1.0);
   void main(void) {
      gl_Position = vec4((aVertexPosition / projectionVector) + center, 0.0, 1.0);
      vTextureCoord = aTextureCoord;
      vColor = aColor;
   }`,

	multi_vert: /* glsl */ `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;
attribute vec4 aColor;
attribute float aTextureId;
uniform vec2 projectionVector;
varying vec2 vTextureCoord;
varying vec4 vColor;
varying float vTextureId;
const vec2 center = vec2(-1.0, 1.0);
void main(void) {
   gl_Position = vec4((aVertexPosition / projectionVector) + center, 0.0, 1.0);
   vTextureCoord = aTextureCoord;
   vColor = aColor;
   vTextureId = aTextureId;
}`,

	multi_frag: /* glsl */ `
precision lowp float;
varying vec2 vTextureCoord;
varying vec4 vColor;
varying float vTextureId;
uniform sampler2D uSamplers[8];
void main(void) {
    vec4 color;
    int id = int(vTextureId + 0.5);
    if (id == 0)      color = texture2D(uSamplers[0], vTextureCoord);
    else if (id == 1) color = texture2D(uSamplers[1], vTextureCoord);
    else if (id == 2) color = texture2D(uSamplers[2], vTextureCoord);
    else if (id == 3) color = texture2D(uSamplers[3], vTextureCoord);
    else if (id == 4) color = texture2D(uSamplers[4], vTextureCoord);
    else if (id == 5) color = texture2D(uSamplers[5], vTextureCoord);
    else if (id == 6) color = texture2D(uSamplers[6], vTextureCoord);
    else              color = texture2D(uSamplers[7], vTextureCoord);
    gl_FragColor = color * vColor;
}`,

	texture_frag: /* glsl */ `
precision lowp float;
varying vec2 vTextureCoord;
varying vec4 vColor;
uniform sampler2D uSampler;
void main(void) {
    gl_FragColor = texture2D(uSampler, vTextureCoord) * vColor;
}`,

	primitive_frag: /* glsl */ `
precision lowp float;
varying vec2 vTextureCoord;
varying vec4 vColor;
void main(void) {
    gl_FragColor = vColor;
}`,

	blur_frag: /* glsl */ `
precision mediump float;
uniform vec2 blur;
uniform sampler2D uSampler;
varying vec2 vTextureCoord;
uniform vec2 uTextureSize;
void main() {
    const int sampleRadius = 5;
    const int samples = sampleRadius * 2 + 1;
    vec2 blurUv = blur / uTextureSize;
    vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
    vec2 uv = vec2(0.0, 0.0);
    blurUv /= float(sampleRadius);
    for (int i = -sampleRadius; i <= sampleRadius; i++) {
        uv.x = vTextureCoord.x + float(i) * blurUv.x;
        uv.y = vTextureCoord.y + float(i) * blurUv.y;
        color += texture2D(uSampler, uv);
    }
    color /= float(samples);
    gl_FragColor = color;
}`,

	blur_h_frag: /* glsl */ `
precision mediump float;
uniform float blurX;
uniform sampler2D uSampler;
varying vec2 vTextureCoord;
uniform vec2 uTextureSize;
void main() {
    float step = 1.0 / uTextureSize.x;
    vec4 color = vec4(0.0);
    float total = 0.0;
    for (int i = -8; i <= 8; i++) {
        if (abs(float(i)) > blurX) continue;
        float weight = 1.0 - abs(float(i)) / (blurX + 1.0);
        color += texture2D(uSampler, vTextureCoord + vec2(float(i) * step, 0.0)) * weight;
        total += weight;
    }
    gl_FragColor = color / total;
}`,

	blur_v_frag: /* glsl */ `
precision mediump float;
uniform float blurY;
uniform sampler2D uSampler;
varying vec2 vTextureCoord;
uniform vec2 uTextureSize;
void main() {
    float step = 1.0 / uTextureSize.y;
    vec4 color = vec4(0.0);
    float total = 0.0;
    for (int i = -8; i <= 8; i++) {
        if (abs(float(i)) > blurY) continue;
        float weight = 1.0 - abs(float(i)) / (blurY + 1.0);
        color += texture2D(uSampler, vTextureCoord + vec2(0.0, float(i) * step)) * weight;
        total += weight;
    }
    gl_FragColor = color / total;
}`,

	glow_frag: /* glsl */ `
precision highp float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float dist;
uniform float angle;
uniform vec4 color;
uniform float alpha;
uniform float blurX;
uniform float blurY;
uniform float strength;
uniform float inner;
uniform float knockout;
uniform float hideObject;
uniform vec2 uTextureSize;
float random(vec2 scale) {
    return fract(sin(dot(gl_FragCoord.xy, scale)) * 43758.5453);
}
void main(void) {
    vec2 px = vec2(1.0 / uTextureSize.x, 1.0 / uTextureSize.y);
    const float linearSamplingTimes = 7.0;
    const float circleSamplingTimes = 12.0;
    vec4 ownColor = texture2D(uSampler, vTextureCoord);
    vec4 curColor;
    float totalAlpha = 0.0;
    float maxTotalAlpha = 0.0;
    float offsetX = dist * cos(angle) * px.x;
    float offsetY = dist * sin(angle) * px.y;
    const float PI = 3.14159265358979323846264;
    float offset = PI * 2.0 / circleSamplingTimes * random(vec2(12.9898, 78.233));
    float stepX = blurX * px.x / linearSamplingTimes;
    float stepY = blurY * px.y / linearSamplingTimes;
    for (float a = 0.0; a <= PI * 2.0; a += PI * 2.0 / circleSamplingTimes) {
        float cosAngle = cos(a + offset);
        float sinAngle = sin(a + offset);
        for (float i = 1.0; i <= linearSamplingTimes; i++) {
            float curDistanceX = i * stepX * cosAngle;
            float curDistanceY = i * stepY * sinAngle;
            if (vTextureCoord.x + curDistanceX - offsetX >= 0.0 && vTextureCoord.y + curDistanceY + offsetY <= 1.0) {
                curColor = texture2D(uSampler, vec2(vTextureCoord.x + curDistanceX - offsetX, vTextureCoord.y + curDistanceY + offsetY));
                totalAlpha += (linearSamplingTimes - i) * curColor.a;
            }
            maxTotalAlpha += (linearSamplingTimes - i);
        }
    }
    ownColor.a = max(ownColor.a, 0.0001);
    ownColor.rgb = ownColor.rgb / ownColor.a;
    float outerGlowAlpha = (totalAlpha / maxTotalAlpha) * strength * alpha * (1.0 - inner) * max(min(hideObject, knockout), 1.0 - ownColor.a);
    float innerGlowAlpha = ((maxTotalAlpha - totalAlpha) / maxTotalAlpha) * strength * alpha * inner * ownColor.a;
    ownColor.a = max(ownColor.a * knockout * (1.0 - hideObject), 0.0001);
    vec3 mix1 = mix(ownColor.rgb, color.rgb, innerGlowAlpha / (innerGlowAlpha + ownColor.a));
    vec3 mix2 = mix(mix1, color.rgb, outerGlowAlpha / (innerGlowAlpha + ownColor.a + outerGlowAlpha));
    float resultAlpha = min(ownColor.a + outerGlowAlpha + innerGlowAlpha, 1.0);
    gl_FragColor = vec4(mix2 * resultAlpha, resultAlpha);
}`,

	colorTransform_frag: /* glsl */ `
precision mediump float;
varying vec2 vTextureCoord;
varying vec4 vColor;
uniform mat4 matrix;
uniform vec4 colorAdd;
uniform sampler2D uSampler;
void main(void) {
    vec4 texColor = texture2D(uSampler, vTextureCoord);
    if (texColor.a > 0.0) {
        texColor = vec4(texColor.rgb / texColor.a, texColor.a);
    }
    vec4 locColor = clamp(texColor * matrix + colorAdd, 0.0, 1.0);
    gl_FragColor = vColor * vec4(locColor.rgb * locColor.a, locColor.a);
}`,
} as const;

// ── Dynamic blur shader generation (GLSL ES 1.00) ─────────────────────────────

export const BLUR_TIERS = [4, 8, 16, 32] as const;
export type BlurTier = (typeof BLUR_TIERS)[number];

export function getBlurTier(radius: number): BlurTier {
	for (const tier of BLUR_TIERS) {
		if (radius <= tier) return tier;
	}
	return 32;
}

export function makeBlurHFrag(tier: BlurTier): string {
	return /* glsl */ `
precision mediump float;
uniform float blurX;
uniform sampler2D uSampler;
varying vec2 vTextureCoord;
uniform vec2 uTextureSize;
void main() {
    float step = 1.0 / uTextureSize.x;
    vec4 color = vec4(0.0);
    float total = 0.0;
    for (int i = -${tier}; i <= ${tier}; i++) {
        if (abs(float(i)) > blurX) continue;
        float weight = 1.0 - abs(float(i)) / (blurX + 1.0);
        color += texture2D(uSampler, vTextureCoord + vec2(float(i) * step, 0.0)) * weight;
        total += weight;
    }
    gl_FragColor = color / total;
}`;
}

export function makeBlurVFrag(tier: BlurTier): string {
	return /* glsl */ `
precision mediump float;
uniform float blurY;
uniform sampler2D uSampler;
varying vec2 vTextureCoord;
uniform vec2 uTextureSize;
void main() {
    float step = 1.0 / uTextureSize.y;
    vec4 color = vec4(0.0);
    float total = 0.0;
    for (int i = -${tier}; i <= ${tier}; i++) {
        if (abs(float(i)) > blurY) continue;
        float weight = 1.0 - abs(float(i)) / (blurY + 1.0);
        color += texture2D(uSampler, vTextureCoord + vec2(0.0, float(i) * step)) * weight;
        total += weight;
    }
    gl_FragColor = color / total;
}`;
}
