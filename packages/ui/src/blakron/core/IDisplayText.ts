/**
 * Interface for components that display a simple text string.
 * Implemented by Label, EditableText, and by composite components that
 * expose a `text` property (Button, TextInput, ComboBox).
 */
export interface IDisplayText {
	/**
	 * The text content displayed by this component.
	 */
	text: string;
}
