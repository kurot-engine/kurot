import { CustomFilter } from '../../filters/CustomFilter.js';

const declarations = `
uniform sampler2D uSampler;
uniform vec3 uRowX;
uniform vec3 uRowY;
uniform vec4 uCapture;
uniform vec4 uLocal;
`;

/**
 * Source UVs are framebuffer-oriented; local content coordinates point down.
 */
export function makeBackdropShader(composite: boolean): CustomFilter {
	const body = composite ? `
	vec2 pixel = vec2(gl_FragCoord.x, uHeight - gl_FragCoord.y);
	vec3 p = vec3(pixel, 1.0);
	vec2 local = vec2(dot(uRowX, p), dot(uRowY, p));
	vec2 uv = (local + uLocal.xy) / uLocal.zw;
	OUTPUT = SAMPLE(uSampler, vec2(uv.x, 1.0 - uv.y));
` : `
	vec2 local = vec2(vTextureCoord.x, 1.0 - vTextureCoord.y) * uLocal.zw - uLocal.xy;
	vec3 p = vec3(local, 1.0);
	vec2 pixel = vec2(dot(uRowX, p), dot(uRowY, p));
	vec2 uv = (pixel - uCapture.xy) / uCapture.zw;
	OUTPUT = SAMPLE(uSampler, vec2(uv.x, 1.0 - uv.y));
`;
	const uniforms = declarations + (composite ? `
uniform float uHeight;
` : '');
	return CustomFilter.from({
		webgl1: { fragment: `precision highp float; varying vec2 vTextureCoord;
${uniforms}
void main() { ${body.replaceAll('SAMPLE', 'texture2D').replaceAll('OUTPUT', 'gl_FragColor')} }` },
		webgl2: { fragment: `#version 300 es
precision highp float; in vec2 vTextureCoord; out vec4 outColor;
${uniforms}
void main() { ${body.replaceAll('SAMPLE', 'texture').replaceAll('OUTPUT', 'outColor')} }` },
	});
}
