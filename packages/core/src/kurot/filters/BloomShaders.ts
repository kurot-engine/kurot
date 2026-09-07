/**
 * LDR bloom programs. Inputs and outputs use premultiplied alpha.
 */
export const BloomShaders = {
	extract1: `precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float threshold;
void main() {
    vec4 pixel = texture2D(uSampler, vTextureCoord);
    vec3 color = pixel.a > 0.0 ? pixel.rgb / pixel.a : vec3(0.0);
    float brightness = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float contribution = max(brightness - threshold, 0.0) / max(1.0 - threshold, 0.0001);
    gl_FragColor = pixel * contribution;
}`,
	extract2: `#version 300 es
precision mediump float;
in vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float threshold;
out vec4 result;
void main() {
    vec4 pixel = texture(uSampler, vTextureCoord);
    vec3 color = pixel.a > 0.0 ? pixel.rgb / pixel.a : vec3(0.0);
    float brightness = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float contribution = max(brightness - threshold, 0.0) / max(1.0 - threshold, 0.0001);
    result = pixel * contribution;
}`,
	combine1: `precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform sampler2D uOriginal;
uniform float intensity;
void main() {
    vec4 original = texture2D(uOriginal, vTextureCoord);
    vec4 bloom = texture2D(uSampler, vTextureCoord) * intensity;
    float alpha = clamp(original.a + bloom.a * (1.0 - original.a), 0.0, 1.0);
    gl_FragColor = vec4(min(original.rgb + bloom.rgb, vec3(alpha)), alpha);
}`,
	combine2: `#version 300 es
precision mediump float;
in vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform sampler2D uOriginal;
uniform float intensity;
out vec4 result;
void main() {
    vec4 original = texture(uOriginal, vTextureCoord);
    vec4 bloom = texture(uSampler, vTextureCoord) * intensity;
    float alpha = clamp(original.a + bloom.a * (1.0 - original.a), 0.0, 1.0);
    result = vec4(min(original.rgb + bloom.rgb, vec3(alpha)), alpha);
}`,
} as const;
