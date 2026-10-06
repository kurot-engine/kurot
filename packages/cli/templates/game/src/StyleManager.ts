import { getUIStyleColor, getUIStyleFontAlias, getUIStyleFontFamily, parseUIStyleSheet } from '@kurot/ui-document';
import type { UIStyleFontFace } from '@kurot/ui-document';

/**
 * 项目启动时加载固定样式表，字体全部就绪后再创建 Player 和 UI。
 * 字体别名保持稳定，换字体文件不需要逐个修改皮肤。
 */
export class StyleManager {
	private static _colors: Readonly<Record<string, number>> = Object.freeze({});
	private static _fontFamily?: string;

	public static get fontFamily(): string {
		if (this._fontFamily === undefined) {
			throw new Error('Project styles are not initialized.');
		}
		return this._fontFamily;
	}

	public static async init(): Promise<void> {
		const resourceRoot = new URL('resource/', document.baseURI);
		const response = await fetch(new URL('config/style.json', resourceRoot));
		if (!response.ok) {
			throw new Error(`Unable to load resource/config/style.json: HTTP ${response.status}.`);
		}
		const stylesheet = parseUIStyleSheet(await response.json());
		const loading = Object.entries(stylesheet.fonts.families).flatMap(([key, family]) =>
			family.faces.map(face => this._loadFace(key, face, resourceRoot)),
		);
		const faces = await Promise.all(loading);

		// 全部成功后一次性发布，失败时不留下半套字体或新的默认值。
		for (const face of faces) {
			document.fonts.add(face);
		}
		this._fontFamily = getUIStyleFontFamily(stylesheet);
		this._colors = stylesheet.colors;
	}

	/**
	 * 业务代码需要动态设置文字颜色时，读取与皮肤编译相同的颜色表。
	 */
	public static getColor(key: string): number {
		return getUIStyleColor(this._colors, key);
	}

	private static async _loadFace(key: string, definition: UIStyleFontFace, resourceRoot: URL): Promise<FontFace> {
		const url = new URL(definition.url.split('/').map(encodeURIComponent).join('/'), resourceRoot);
		const face = new FontFace(getUIStyleFontAlias(key), `url("${url.href}")`, {
			weight: String(definition.weight),
		});
		try {
			return await face.load();
		} catch (cause) {
			throw new Error(`Unable to load project font ${key} (${definition.weight}): ${definition.url}.`, { cause });
		}
	}
}
