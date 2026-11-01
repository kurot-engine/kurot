export type TexturePixelSource = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap;

/**
 * Uploads PMA pixels. ImageBitmap ignores UNPACK_PREMULTIPLY_ALPHA_WEBGL and
 * exposes no alpha-mode metadata, so undeclared bitmaps go through Canvas 2D.
 * A caller declaring premultiplied pixels retains the direct-upload path.
 */
export function uploadTextureSource(
	gl: WebGLRenderingContext | WebGL2RenderingContext,
	source: TexturePixelSource,
	sourcePremultipliedAlpha: boolean,
): void {
	if (typeof ImageBitmap === 'undefined' || !(source instanceof ImageBitmap) || sourcePremultipliedAlpha) {
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, sourcePremultipliedAlpha ? 0 : 1);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
		return;
	}
	const canvas = document.createElement('canvas');
	canvas.width = source.width;
	canvas.height = source.height;
	try {
		const context = canvas.getContext('2d');
		if (!context) {
			throw new Error('ImageBitmap alpha normalization requires a Canvas 2D context.');
		}
		context.drawImage(source, 0, 0);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
	} finally {
		// Do not retain another full-size native pixel buffer after the upload.
		canvas.width = canvas.height = 0;
	}
}
