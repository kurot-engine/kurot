/**
 * Static component registry for EXML → JS code generation.
 *
 * Maps short tag names (e.g. `Button`, `Skin`) to their module paths
 * and default properties. This replaces the old runtime-reflection-based
 * `EXMLConfig`.
 */

export interface ComponentInfo {
	/**
	 * Module path to import from (e.g. "@blakron/ui").
	 */
	module: string;
	/**
	 * The default property name — direct children are assigned here.
	 */
	defaultProperty?: string;
	/**
	 * Whether `defaultProperty` accepts an array (vs a single value).
	 */
	isArray?: boolean;
}

/**
 * A project-defined EXML namespace, matching Egret's `xmlns:game="game.*"`
 * convention (see `ProjectConfig.exml.namespaces` in `@blakron/cli`).
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
}

// ── Namespace mappings ───────────────────────────────────────────────

/**
 * Maps XML namespace prefixes to module import paths.
 */
const NAMESPACE_MODULES: Record<string, string> = {
	eui: '@blakron/ui',
	egret: '@blakron/core',
	w: '@blakron/ui',
	core: '@blakron/core',
};

// ── Component registry ───────────────────────────────────────────────

/**
 * All known components with their default properties.
 * Key is the local (un-prefixed) tag name.
 */
const COMPONENTS: Record<string, ComponentInfo> = {
	// Skins & containers
	Skin: { module: '@blakron/ui', defaultProperty: 'elementsContent', isArray: true },
	Group: { module: '@blakron/ui', defaultProperty: 'elementsContent', isArray: true },
	Panel: { module: '@blakron/ui', defaultProperty: 'elementsContent', isArray: true },
	DataGroup: { module: '@blakron/ui', defaultProperty: 'dataProvider', isArray: false },
	Scroller: { module: '@blakron/ui', defaultProperty: 'viewport', isArray: false },

	// Basic controls
	Button: { module: '@blakron/ui' },
	Label: { module: '@blakron/ui' },
	Image: { module: '@blakron/ui' },
	Rect: { module: '@blakron/ui' },
	CheckBox: { module: '@blakron/ui' },
	RadioButton: { module: '@blakron/ui' },
	ToggleButton: { module: '@blakron/ui' },
	ToggleSwitch: { module: '@blakron/ui' },
	ProgressBar: { module: '@blakron/ui' },
	HSlider: { module: '@blakron/ui' },
	VSlider: { module: '@blakron/ui' },
	HScrollBar: { module: '@blakron/ui' },
	VScrollBar: { module: '@blakron/ui' },
	TabBar: { module: '@blakron/ui' },
	List: { module: '@blakron/ui', defaultProperty: 'dataProvider', isArray: false },
	ItemRenderer: { module: '@blakron/ui', defaultProperty: 'elementsContent', isArray: true },
	ViewStack: { module: '@blakron/ui', defaultProperty: 'elementsContent', isArray: true },
	UILayer: { module: '@blakron/ui', defaultProperty: 'elementsContent', isArray: true },

	// Text input controls
	TextInput: { module: '@blakron/ui' },
	EditableText: { module: '@blakron/ui' },

	// Layouts
	Layout: { module: '@blakron/ui' },
	BasicLayout: { module: '@blakron/ui' },
	HorizontalLayout: { module: '@blakron/ui' },
	VerticalLayout: { module: '@blakron/ui' },
	TileLayout: { module: '@blakron/ui' },

	// States
	State: { module: '@blakron/ui' },
	AddItems: { module: '@blakron/ui' },
	SetProperty: { module: '@blakron/ui' },
	SetStateProperty: { module: '@blakron/ui' },

	// Collections
	ArrayCollection: { module: '@blakron/ui', defaultProperty: 'source', isArray: true },

	// Binding
	Binding: { module: '@blakron/ui' },

	// Core classes (egret namespace)
	DisplayObject: { module: '@blakron/core' },
	DisplayObjectContainer: { module: '@blakron/core' },
	Sprite: { module: '@blakron/core' },
	TextField: { module: '@blakron/core' },
	Bitmap: { module: '@blakron/core' },
	Shape: { module: '@blakron/core' },
	Point: { module: '@blakron/core' },
	Rectangle: { module: '@blakron/core' },
	Matrix: { module: '@blakron/core' },
	Event: { module: '@blakron/core' },
	EventDispatcher: { module: '@blakron/core' },
	Timer: { module: '@blakron/core' },

	// Complex controls
	ComboBox: { module: '@blakron/ui', defaultProperty: 'dataProvider', isArray: false },

	// Animation
	Animation: { module: '@blakron/ui' },
};

// ── Public API ───────────────────────────────────────────────────────

/**
 * Look up a component by its tag name.
 *
 * Project-defined namespaces (`customNamespaces`) take priority when the
 * tag's prefix matches one: this mirrors Egret's `xmlns:game="game.*"`
 * convention, where the prefix alone — not the declared xmlns URI — decides
 * which module a tag resolves to (the same is true of the built-in `eui`/
 * `egret` prefixes below).
 *
 * @param tagName - Full tag name possibly with prefix (e.g. "eui:Button")
 * @param customNamespaces - Project-defined namespaces from `blakron.config.ts`
 * @returns Component info or null if not found
 */
export function lookupComponent(
	tagName: string,
	customNamespaces: readonly NamespaceModule[] = [],
): ComponentInfo | null {
	const prefix = tagName.includes(':') ? tagName.split(':')[0] : '';
	if (prefix) {
		const custom = customNamespaces.find(ns => ns.prefix === prefix);
		if (custom) return { module: custom.specifier };
	}

	const local = localName(tagName);
	return COMPONENTS[local] ?? null;
}

/**
 * Get the default property for a component.
 *
 * @param tagName - Full tag name possibly with prefix (e.g. "eui:Button")
 * @param customNamespaces - Project-defined namespaces from `blakron.config.ts`
 * @returns The default property name, or `undefined` if the component is unknown
 */
export function getDefaultProperty(
	tagName: string,
	customNamespaces: readonly NamespaceModule[] = [],
): string | undefined {
	const info = lookupComponent(tagName, customNamespaces);
	return info?.defaultProperty;
}

/**
 * Resolve a tag name to its import module path.
 *
 * @param tagName - Full tag name possibly with prefix (e.g. "eui:Button")
 * @param customNamespaces - Project-defined namespaces from `blakron.config.ts`
 * @returns The module path, or `null` if the tag could not be resolved
 */
export function resolveModule(tagName: string, customNamespaces: readonly NamespaceModule[] = []): string | null {
	// Check for namespace prefix first
	if (tagName.includes(':')) {
		const [prefix] = tagName.split(':');
		const custom = customNamespaces.find(ns => ns.prefix === prefix);
		if (custom) return custom.specifier;
		const modulePath = NAMESPACE_MODULES[prefix];
		if (modulePath) return modulePath;
	}

	// Fall back to component registry
	const info = lookupComponent(tagName, customNamespaces);
	return info?.module ?? null;
}

/**
 * Get the local (un-prefixed) class name from a tag name.
 *
 * @param tagName - Full tag name possibly with prefix (e.g. "eui:Button")
 * @returns The local class name (e.g. "Button")
 */
export function localName(tagName: string): string {
	return tagName.includes(':') ? tagName.split(':').pop()! : tagName;
}

/**
 * Checks if a tag name is a known property node (contains a dot).
 *
 * e.g. "eui:Button.label" → property "label" on `Button`.
 *
 * @param tagName - Full tag name to check
 * @returns Whether the tag name contains a dot
 */
export function isPropertyNode(tagName: string): boolean {
	return tagName.includes('.');
}

/**
 * Parse a property node tag like "eui:Button.label" into its parts.
 *
 * @param tagName - Full property node tag name
 * @returns The owner class and property name, or `null` if not a property node
 */
export function parsePropertyNode(tagName: string): { owner: string; property: string } | null {
	// First strip namespace prefix
	const parts = tagName.split('.');
	if (parts.length < 2) return null;
	const ownerPart = parts[0];
	const property = parts.slice(1).join('.');
	return { owner: localName(ownerPart), property };
}
