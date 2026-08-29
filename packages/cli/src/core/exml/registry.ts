/**
 * Static component registry for EXML → JS code generation.
 *
 * Maps local tag names such as `Button` and `Skin` to their module specifiers
 * and default properties.
 */

export interface ComponentInfo {
	/**
	 * Module path to import from (e.g. "@kurot/ui").
	 */
	readonly module: string;
	/**
	 * The default property name — direct children are assigned here.
	 */
	readonly defaultProperty?: string;
	/**
	 * Whether `defaultProperty` accepts an array (vs a single value).
	 */
	readonly isArray?: boolean;
}

/**
 * A project-defined EXML namespace, matching Egret's `xmlns:game="game.*"`
 * convention (see `ProjectConfig.exml.namespaces` in `@kurot/cli`).
 */
export interface NamespaceModule {
	/**
	 * The XML namespace prefix (e.g. `game` for `xmlns:game="game.*"`).
	 */
	readonly prefix: string;
	/**
	 * Virtual module specifier resolved via the HTML import map.
	 */
	readonly specifier: string;
	/**
	 * Exact component names exported by an automatically discovered namespace.
	 * Omitted for a manually maintained namespace whose exports are only known
	 * to the module bundler.
	 */
	readonly componentNames?: ReadonlySet<string>;
}

// ── Namespace mappings ───────────────────────────────────────────────

/**
 * Maps XML namespace prefixes to module import paths.
 */
const NAMESPACE_MODULES: Record<string, string> = {
	eui: '@kurot/ui',
	egret: '@kurot/core',
	w: '@kurot/ui',
	core: '@kurot/core',
};

// ── Component registry ───────────────────────────────────────────────

/**
 * All known components with their default properties.
 * Key is the local (un-prefixed) tag name.
 */
const COMPONENTS: Record<string, ComponentInfo> = {
	// Skins & containers
	Skin: { module: '@kurot/ui', defaultProperty: 'elementsContent', isArray: true },
	Group: { module: '@kurot/ui', defaultProperty: 'elementsContent', isArray: true },
	Panel: { module: '@kurot/ui', defaultProperty: 'elementsContent', isArray: true },
	DataGroup: { module: '@kurot/ui', defaultProperty: 'dataProvider', isArray: false },
	Scroller: { module: '@kurot/ui', defaultProperty: 'viewport', isArray: false },

	// Basic controls
	Button: { module: '@kurot/ui' },
	Label: { module: '@kurot/ui' },
	Image: { module: '@kurot/ui' },
	Rect: { module: '@kurot/ui' },
	CheckBox: { module: '@kurot/ui' },
	RadioButton: { module: '@kurot/ui' },
	ToggleButton: { module: '@kurot/ui' },
	ToggleSwitch: { module: '@kurot/ui' },
	ProgressBar: { module: '@kurot/ui' },
	HSlider: { module: '@kurot/ui' },
	VSlider: { module: '@kurot/ui' },
	HScrollBar: { module: '@kurot/ui' },
	VScrollBar: { module: '@kurot/ui' },
	TabBar: { module: '@kurot/ui' },
	List: { module: '@kurot/ui', defaultProperty: 'dataProvider', isArray: false },
	ItemRenderer: { module: '@kurot/ui', defaultProperty: 'elementsContent', isArray: true },
	ViewStack: { module: '@kurot/ui', defaultProperty: 'elementsContent', isArray: true },
	UILayer: { module: '@kurot/ui', defaultProperty: 'elementsContent', isArray: true },

	// Text input controls
	TextInput: { module: '@kurot/ui' },
	EditableText: { module: '@kurot/ui' },

	// Layouts
	Layout: { module: '@kurot/ui' },
	BasicLayout: { module: '@kurot/ui' },
	HorizontalLayout: { module: '@kurot/ui' },
	VerticalLayout: { module: '@kurot/ui' },
	TileLayout: { module: '@kurot/ui' },

	// States
	State: { module: '@kurot/ui' },
	AddItems: { module: '@kurot/ui' },
	SetProperty: { module: '@kurot/ui' },
	SetStateProperty: { module: '@kurot/ui' },

	// Collections
	ArrayCollection: { module: '@kurot/ui', defaultProperty: 'source', isArray: true },

	// Binding
	Binding: { module: '@kurot/ui' },

	// Core classes (egret namespace)
	DisplayObject: { module: '@kurot/core' },
	DisplayObjectContainer: { module: '@kurot/core' },
	Sprite: { module: '@kurot/core' },
	TextField: { module: '@kurot/core' },
	Bitmap: { module: '@kurot/core' },
	Shape: { module: '@kurot/core' },
	Point: { module: '@kurot/core' },
	Rectangle: { module: '@kurot/core' },
	Matrix: { module: '@kurot/core' },
	Event: { module: '@kurot/core' },
	EventDispatcher: { module: '@kurot/core' },
	Timer: { module: '@kurot/core' },

	// Complex controls
	ComboBox: { module: '@kurot/ui', defaultProperty: 'dataProvider', isArray: false },

	// Animation
	Animation: { module: '@kurot/ui' },
};

// ── Public API ───────────────────────────────────────────────────────

/**
 * Looks up a component by its tag name.
 *
 * Project-defined namespaces (`customNamespaces`) take priority when the
 * tag's prefix matches one: this mirrors Egret's `xmlns:game="game.*"`
 * convention, where the prefix alone — not the declared xmlns URI — decides
 * which module a tag resolves to (the same is true of the built-in `eui`/
 * `egret` prefixes below).
 *
 * @param tagName - Complete tag name, optionally including a prefix.
 * @param customNamespaces - Project-defined namespaces from `kurot.config.ts`.
 * @returns Component metadata, or `undefined` when the tag is unknown.
 */
export function lookupComponent(
	tagName: string,
	customNamespaces: readonly NamespaceModule[] = [],
): ComponentInfo | undefined {
	const prefix = tagName.includes(':') ? tagName.split(':')[0] : '';
	if (prefix) {
		const custom = customNamespaces.find(ns => ns.prefix === prefix);
		if (custom) {
			const name = localName(tagName);
			if (custom.componentNames && !custom.componentNames.has(name)) return undefined;
			return { module: custom.specifier };
		}
	}

	const local = localName(tagName);
	return COMPONENTS[local];
}

/**
 * Gets the default property for a component.
 *
 * @param tagName - Complete tag name, optionally including a prefix.
 * @param customNamespaces - Project-defined namespaces from `kurot.config.ts`.
 * @returns The default property name, or `undefined` when none is registered.
 */
export function getDefaultProperty(
	tagName: string,
	customNamespaces: readonly NamespaceModule[] = [],
): string | undefined {
	const info = lookupComponent(tagName, customNamespaces);
	return info?.defaultProperty;
}

/**
 * Resolves a tag name to its import module path.
 *
 * @param tagName - Complete tag name, optionally including a prefix.
 * @param customNamespaces - Project-defined namespaces from `kurot.config.ts`.
 * @returns The module specifier, or `undefined` when the tag is unknown.
 */
export function resolveModule(tagName: string, customNamespaces: readonly NamespaceModule[] = []): string | undefined {
	if (tagName.includes(':')) {
		const [prefix] = tagName.split(':');
		const custom = customNamespaces.find(ns => ns.prefix === prefix);
		if (custom) {
			const name = localName(tagName);
			return custom.componentNames && !custom.componentNames.has(name) ? undefined : custom.specifier;
		}
		const modulePath = NAMESPACE_MODULES[prefix];
		if (modulePath) return modulePath;
	}

	const info = lookupComponent(tagName, customNamespaces);
	return info?.module;
}

/**
 * Gets the local class name from a tag name.
 *
 * @param tagName - Complete tag name, optionally including a prefix.
 * @returns The unprefixed class name.
 */
export function localName(tagName: string): string {
	return tagName.includes(':') ? tagName.split(':').pop()! : tagName;
}

/**
 * Suggests the closest registered component tag for a misspelled built-in tag.
 *
 * @param tagName - Complete tag name that could not be resolved.
 * @param customNamespaces - Project-defined namespaces available to the skin.
 * @returns A close registered tag, or `undefined` when no candidate is reliable.
 */
export function suggestComponentTag(
	tagName: string,
	customNamespaces: readonly NamespaceModule[] = [],
): string | undefined {
	const separator = tagName.indexOf(':');
	const prefix = separator >= 0 ? tagName.slice(0, separator) : '';
	const custom = customNamespaces.find(namespace => namespace.prefix === prefix);
	if (custom?.componentNames) {
		return suggestName(tagName, prefix, [...custom.componentNames]);
	}
	const expectedModule = prefix ? NAMESPACE_MODULES[prefix] : undefined;
	if (prefix && !expectedModule) return undefined;

	const requestedName = localName(tagName);
	const names = Object.entries(COMPONENTS)
		.filter(([, info]) => !expectedModule || info.module === expectedModule)
		.map(([name]) => name);
	return suggestName(requestedName, prefix, names);
}

/**
 * Checks whether a tag name uses EXML property-node syntax.
 *
 * e.g. "eui:Button.label" → property "label" on `Button`.
 *
 * @param tagName - Complete tag name to inspect.
 * @returns Whether the tag contains a property separator.
 */
export function isPropertyNode(tagName: string): boolean {
	return tagName.includes('.');
}

/**
 * Parses a property-node tag such as `eui:Button.label`.
 *
 * @param tagName - Complete property-node tag name.
 * @returns The owner and property names, or `undefined` when the tag is not a property node.
 */
export function parsePropertyNode(tagName: string): { owner: string; property: string } | undefined {
	const parts = tagName.split('.');
	if (parts.length < 2) return undefined;
	const ownerPart = parts[0];
	const property = parts.slice(1).join('.');
	return { owner: localName(ownerPart), property };
}

function suggestName(tagName: string, prefix: string, names: readonly string[]): string | undefined {
	const requestedName = localName(tagName);
	const candidates = names
		.map(name => ({ name, distance: editDistance(requestedName, name) }))
		.sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));
	const candidate = candidates[0];
	if (!candidate || candidate.distance > suggestionThreshold(requestedName.length)) return undefined;
	return prefix ? `${prefix}:${candidate.name}` : candidate.name;
}

function suggestionThreshold(length: number): number {
	if (length <= 3) return 1;
	if (length <= 7) return 2;
	return 3;
}

function editDistance(a: string, b: string): number {
	const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
	for (let i = 1; i <= a.length; i++) {
		const current = [i];
		for (let j = 1; j <= b.length; j++) {
			const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
			current.push(Math.min(current[j - 1] + 1, previous[j] + 1, substitution));
		}
		previous.splice(0, previous.length, ...current);
	}
	return previous[b.length];
}
