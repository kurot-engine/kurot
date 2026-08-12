/**
 * GLSL ES 3.00 shaders — used with WebGL2 context.
 * For WebGL1 (GLSL ES 1.00) shaders see ../webgl/ShaderLib.ts
 */
export const ShaderLib2 = {
	default_vert: /* glsl */ `#version 300 es
in vec2 aVertexPosition;
in vec2 aTextureCoord;
in vec4 aColor;
uniform vec2 projectionVector;
out vec2 vTextureCoord;
out vec4 vColor;
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
	fullscreen_vert: /* glsl */ `#version 300 es
in vec2 aVertexPosition;
in vec2 aTextureCoord;
in vec4 aColor;
uniform vec2 projectionVector;
out vec2 vTextureCoord;
out vec4 vColor;
const vec2 center = vec2(-1.0, 1.0);
void main(void) {
   gl_Position = vec4((aVertexPosition / projectionVector) + center, 0.0, 1.0);
   vTextureCoord = aTextureCoord;
   vColor = aColor;
}`,

	// Multi-texture vertex shader: carries textureId as a float attribute.
	multi_vert: /* glsl */ `#version 300 es
in vec2 aVertexPosition;
in vec2 aTextureCoord;
in vec4 aColor;
in float aTextureId;
uniform vec2 projectionVector;
out vec2 vTextureCoord;
out vec4 vColor;
out float vTextureId;
const vec2 center = vec2(-1.0, 1.0);
void main(void) {
   gl_Position = vec4((aVertexPosition / projectionVector) + center, 0.0, 1.0);
   vTextureCoord = aTextureCoord;
   vColor = aColor;
   vTextureId = aTextureId;
}`,

	// Multi-texture fragment shader.
	// Each branch uses a constant integer to index the sampler array, which
	// satisfies GLSL ES 3.00's requirement that sampler indices be constant or
	// dynamically uniform. (Direct variable indexing is NOT allowed.)
	multi_frag: /* glsl */ `#version 300 es
precision lowp float;
in vec2 vTextureCoord;
in vec4 vColor;
in float vTextureId;
uniform sampler2D uSamplers[8];
out vec4 fragColor;
void main(void) {
    vec4 color;
    int id = int(vTextureId + 0.5);
    if (id == 0)      color = texture(uSamplers[0], vTextureCoord);
    else if (id == 1) color = texture(uSamplers[1], vTextureCoord);
    else if (id == 2) color = texture(uSamplers[2], vTextureCoord);
    else if (id == 3) color = texture(uSamplers[3], vTextureCoord);
    else if (id == 4) color = texture(uSamplers[4], vTextureCoord);
    else if (id == 5) color = texture(uSamplers[5], vTextureCoord);
    else if (id == 6) color = texture(uSamplers[6], vTextureCoord);
    else              color = texture(uSamplers[7], vTextureCoord);
    fragColor = color * vColor;
}`,

	texture_frag: /* glsl */ `#version 300 es
precision lowp float;
in vec2 vTextureCoord;
in vec4 vColor;
uniform sampler2D uSampler;
out vec4 fragColor;
void main(void) {
    fragColor = texture(uSampler, vTextureCoord) * vColor;
}`,

	primitive_frag: /* glsl */ `#version 300 es
precision lowp float;
in vec2 vTextureCoord;
in vec4 vColor;
out vec4 fragColor;
void main(void) {
    fragColor = vColor;
}`,

	blur_frag: /* glsl */ `#version 300 es
precision mediump float;
uniform vec2 blur;
uniform sampler2D uSampler;
in vec2 vTextureCoord;
uniform vec2 uTextureSize;
out vec4 fragColor;
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
        color += texture(uSampler, uv);
    }
    color /= float(samples);
    fragColor = color;
}`,

	// Horizontal blur pass for ping-pong two-pass Gaussian blur.
	blur_h_frag: /* glsl */ `#version 300 es
precision mediump float;
uniform float blurX;
uniform sampler2D uSampler;
in vec2 vTextureCoord;
uniform vec2 uTextureSize;
out vec4 fragColor;
void main() {
    float step = 1.0 / uTextureSize.x;
    vec4 color = vec4(0.0);
    float total = 0.0;
    for (int i = -8; i <= 8; i++) {
        if (abs(float(i)) > blurX) continue;
        float weight = 1.0 - abs(float(i)) / (blurX + 1.0);
        color += texture(uSampler, vTextureCoord + vec2(float(i) * step, 0.0)) * weight;
        total += weight;
    }
    fragColor = color / total;
}`,

	// Vertical blur pass for ping-pong two-pass Gaussian blur.
	blur_v_frag: /* glsl */ `#version 300 es
precision mediump float;
uniform float blurY;
uniform sampler2D uSampler;
in vec2 vTextureCoord;
uniform vec2 uTextureSize;
out vec4 fragColor;
void main() {
    float step = 1.0 / uTextureSize.y;
    vec4 color = vec4(0.0);
    float total = 0.0;
    for (int i = -8; i <= 8; i++) {
        if (abs(float(i)) > blurY) continue;
        float weight = 1.0 - abs(float(i)) / (blurY + 1.0);
        color += texture(uSampler, vTextureCoord + vec2(0.0, float(i) * step)) * weight;
        total += weight;
    }
    fragColor = color / total;
}`,

	glow_frag: /* glsl */ `#version 300 es
precision highp float;
in vec2 vTextureCoord;
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
out vec4 fragColor;
float random(vec2 scale) {
    return fract(sin(dot(gl_FragCoord.xy, scale)) * 43758.5453);
}
void main(void) {
    vec2 px = vec2(1.0 / uTextureSize.x, 1.0 / uTextureSize.y);
    const float linearSamplingTimes = 7.0;
    const float circleSamplingTimes = 12.0;
    vec4 ownColor = texture(uSampler, vTextureCoord);
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
                curColor = texture(uSampler, vec2(vTextureCoord.x + curDistanceX - offsetX, vTextureCoord.y + curDistanceY + offsetY));
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
    fragColor = vec4(mix2 * resultAlpha, resultAlpha);
}`,

	colorTransform_frag: /* glsl */ `#version 300 es
precision mediump float;
in vec2 vTextureCoord;
in vec4 vColor;
uniform mat4 matrix;
uniform vec4 colorAdd;
uniform sampler2D uSampler;
out vec4 fragColor;
void main(void) {
    vec4 texColor = texture(uSampler, vTextureCoord);
    if (texColor.a > 0.0) {
        texColor = vec4(texColor.rgb / texColor.a, texColor.a);
    }
    vec4 locColor = clamp(texColor * matrix + colorAdd, 0.0, 1.0);
    fragColor = vColor * vec4(locColor.rgb * locColor.a, locColor.a);
}`,
} as const;

// ── Dynamic blur shader generation (GLSL ES 3.00) ─────────────────────────────

export const BLUR_TIERS2 = [4, 8, 16, 32] as const;
export type BlurTier2 = (typeof BLUR_TIERS2)[number];

export function getBlurTier2(radius: number): BlurTier2 {
	for (const tier of BLUR_TIERS2) {
		if (radius <= tier) return tier;
	}
	return 32;
}

export function makeBlurHFrag2(tier: BlurTier2): string {
	return /* glsl */ `#version 300 es
precision mediump float;
uniform float blurX;
uniform sampler2D uSampler;
in vec2 vTextureCoord;
uniform vec2 uTextureSize;
out vec4 fragColor;
void main() {
    float step = 1.0 / uTextureSize.x;
    vec4 color = vec4(0.0);
    float total = 0.0;
    for (int i = -${tier}; i <= ${tier}; i++) {
        if (abs(float(i)) > blurX) continue;
        float weight = 1.0 - abs(float(i)) / (blurX + 1.0);
        color += texture(uSampler, vTextureCoord + vec2(float(i) * step, 0.0)) * weight;
        total += weight;
    }
    fragColor = color / total;
}`;
}

export function makeBlurVFrag2(tier: BlurTier2): string {
	return /* glsl */ `#version 300 es
precision mediump float;
uniform float blurY;
uniform sampler2D uSampler;
in vec2 vTextureCoord;
uniform vec2 uTextureSize;
out vec4 fragColor;
void main() {
    float step = 1.0 / uTextureSize.y;
    vec4 color = vec4(0.0);
    float total = 0.0;
    for (int i = -${tier}; i <= ${tier}; i++) {
        if (abs(float(i)) > blurY) continue;
        float weight = 1.0 - abs(float(i)) / (blurY + 1.0);
        color += texture(uSampler, vTextureCoord + vec2(0.0, float(i) * step)) * weight;
        total += weight;
    }
    fragColor = color / total;
}`;
}
