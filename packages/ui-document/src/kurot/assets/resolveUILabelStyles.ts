import type { UIDocument } from '../model/UIDocument.js';
import type { UINode } from '../model/UINode.js';
import type { UIStyleSheet } from './UIStyleSheet.js';
import type { UILabelStyle } from './UILabelStyle.js';

/**
 * 绑定于默认状态的文字预设。组件局部属性及 Skin 状态覆盖始终优先；不读取文件或修改源文档。
 */
export function getUILabelStyle(style: UIStyleSheet | undefined, reference: unknown): UILabelStyle {
	if (reference === undefined || reference === '') {
		return {};
	}
	if (typeof reference !== 'string' || !/^@style:labels:[a-z][a-z0-9-]*$/.test(reference)) {
		throw new Error('Label textStyle must use @style:labels:<key>.');
	}
	const key = reference.slice('@style:labels:'.length);
	if (!style || !Object.hasOwn(style.labels, key)) {
		throw new Error(`Unknown Label style: ${key}.`);
	}
	return style.labels[key]!;
}

/**
 * 在编译或预览副本里展开 Label 预设。保存、XML 与历史必须继续使用原文档。
 */
export function resolveUILabelStyles(document: UIDocument, style?: UIStyleSheet): UIDocument {
	for (const definitions of [document.contract.states, document.contract.variants]) {
		for (const [name, definition] of Object.entries(definitions)) {
			if (definition.overrides.some(override => override.property === 'textStyle')) {
				throw new Error(
					`Style selection is Default-state-only: ${name}.textStyle. Override individual Label properties instead.`,
				);
			}
		}
	}
	const boundProperties = [
		...Object.values(document.contract.parameters).flatMap(parameter => parameter.bindings ?? []),
		...Object.values(document.contract.dataBindings ?? {}),
	];
	if (boundProperties.some(binding => binding.property === 'textStyle')) {
		throw new Error(
			'Label textStyle cannot be a parameter or data binding. Bind individual Label properties instead.',
		);
	}

	function visit(node: UINode): UINode {
		if (node.instance?.overrides.some(override => override.property === 'textStyle')) {
			throw new Error(
				`Node ${node.id}: instance textStyle overrides are unsupported. Override individual Label properties instead.`,
			);
		}
		let properties = node.properties;
		if (Object.hasOwn(node.properties, 'textStyle')) {
			if (node.type !== 'kui.Label') {
				throw new Error(`Node ${node.id}: textStyle is supported only on Label.`);
			}
			try {
				const { textStyle, ...local } = node.properties;
				properties = { ...getUILabelStyle(style, textStyle), ...local };
			} catch (cause) {
				throw new Error(`Node ${node.id}.textStyle: ${String(cause)}`, { cause });
			}
		}
		return {
			...node,
			properties,
			children: node.children.map(visit),
			...(node.instance
				? {
						instance: {
							...node.instance,
							slots: Object.fromEntries(
								Object.entries(node.instance.slots).map(([name, children]) => [
									name,
									children.map(visit),
								]),
							),
						},
					}
				: {}),
		};
	}
	return { ...document, root: visit(document.root) };
}
