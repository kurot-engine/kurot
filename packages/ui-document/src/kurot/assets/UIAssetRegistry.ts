import type { UIDocument } from '../model/UIDocument.js';
import type { UIPropertyValue } from '../model/UIPropertyValue.js';
import type {
	UIDesignTokenType,
	UIResourceType,
} from '../model/UIReference.js';
import { UIDocumentValidationError } from '../serialization/UIDocumentValidationError.js';
import type { UIDiagnostic } from '../validation/UIDiagnostic.js';
import { validateUIDocument } from '../validation/validateUIDocument.js';
import { validatePropertyValue } from '../validation/validationHelpers.js';
import type {
	UIDesignTokenDefinition,
	UIResourceDefinition,
} from './UIProjectDefinition.js';

const RESOURCE_TYPES = new Set<UIResourceType>([
	'animation',
	'font',
	'image',
	'spine',
	'sprite-frame',
]);
const TOKEN_TYPES = new Set<UIDesignTokenType>([
	'color',
	'number',
	'spacing',
	'string',
	'typography',
]);

/**
 * In-memory project catalog used for deterministic cross-document resolution.
 */
export class UIAssetRegistry {
	private readonly _assets = new Map<string, UIDocument>();
	private readonly _resources = new Map<string, UIResourceDefinition>();
	private readonly _tokens = new Map<string, UIDesignTokenDefinition>();

	/**
	 * Registers one structurally valid asset without replacing an existing identity.
	 */
	public registerAsset(document: UIDocument): void {
		const diagnostics = validateUIDocument(document);
		if (diagnostics.length > 0) {
			throw new UIDocumentValidationError(diagnostics);
		}
		assertNonEmpty(document.id, 'UI asset id');
		if (this._assets.has(document.id)) {
			throw new Error(`UI asset "${document.id}" is already registered.`);
		}
		this._assets.set(document.id, document);
	}

	/**
	 * Registers one project resource without replacing an existing key.
	 */
	public registerResource(definition: UIResourceDefinition): void {
		assertNonEmpty(definition.key, 'UI resource key');
		if (!RESOURCE_TYPES.has(definition.resourceType)) {
			throw new Error(`Unsupported UI resource type "${String(definition.resourceType)}".`);
		}
		if (this._resources.has(definition.key)) {
			throw new Error(`UI resource "${definition.key}" is already registered.`);
		}
		this._resources.set(definition.key, Object.freeze({ ...definition }));
	}

	/**
	 * Registers one project design token without replacing an existing key.
	 */
	public registerToken(definition: UIDesignTokenDefinition): void {
		assertNonEmpty(definition.key, 'UI design token key');
		if (!TOKEN_TYPES.has(definition.tokenType)) {
			throw new Error(`Unsupported UI design token type "${String(definition.tokenType)}".`);
		}
		const diagnostics: UIDiagnostic[] = [];
		validatePropertyValue(definition.value, '$.value', diagnostics);
		if (
			diagnostics.length > 0 ||
			!matchesTokenValue(definition.tokenType, definition.value)
		) {
			throw new Error(`UI design token "${definition.key}" has an invalid value.`);
		}
		if (this._tokens.has(definition.key)) {
			throw new Error(`UI design token "${definition.key}" is already registered.`);
		}
		this._tokens.set(definition.key, Object.freeze({ ...definition }));
	}

	/**
	 * Returns an exact UI asset by project identity.
	 */
	public getAsset(id: string): UIDocument | undefined {
		return this._assets.get(id);
	}

	/**
	 * Returns an exact project resource by key.
	 */
	public getResource(key: string): UIResourceDefinition | undefined {
		return this._resources.get(key);
	}

	/**
	 * Returns an exact project design token by key.
	 */
	public getToken(key: string): UIDesignTokenDefinition | undefined {
		return this._tokens.get(key);
	}

	/**
	 * Lists UI assets in stable identifier order.
	 */
	public listAssets(): readonly UIDocument[] {
		return [...this._assets.values()].sort((a, b) => compareStrings(a.id, b.id));
	}

	/**
	 * Lists resources in stable key order.
	 */
	public listResources(): readonly UIResourceDefinition[] {
		return [...this._resources.values()].sort((a, b) => compareStrings(a.key, b.key));
	}

	/**
	 * Lists design tokens in stable key order.
	 */
	public listTokens(): readonly UIDesignTokenDefinition[] {
		return [...this._tokens.values()].sort((a, b) => compareStrings(a.key, b.key));
	}
}

function assertNonEmpty(value: string, label: string): void {
	if (typeof value !== 'string' || value.trim().length === 0) {
		throw new Error(`${label} must be a non-empty string.`);
	}
}

function compareStrings(a: string, b: string): number {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}

function matchesTokenValue(
	tokenType: UIDesignTokenType,
	value: UIPropertyValue,
): boolean {
	switch (tokenType) {
		case 'color':
			return (
				typeof value === 'number' &&
				Number.isInteger(value) &&
				value >= 0 &&
				value <= 0xffffff
			);
		case 'number':
			return typeof value === 'number';
		case 'spacing':
			return typeof value === 'number' && value >= 0;
		case 'string':
			return typeof value === 'string';
		case 'typography':
			return typeof value === 'object' && !Array.isArray(value);
		default:
			return false;
	}
}
