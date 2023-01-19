import { ASSERT } from '../../util/error_util';
import { BaseUIElement } from './base_element';
import { LabelElement } from './label';

/**
 * A `ConfigUIElement` is a UI element that has a value the user can change.
 * For example, sliders, comboboxes and checkboxes are `ConfigUIElement`.
 */
export abstract class ConfigUIElement<T, F> extends BaseUIElement<F> {
    private _label: string;
    private _description?: string;
    private _labelElement: LabelElement;
    private _hasLabel: boolean;
    private _value?: T;
    private _cachedValue?: T;
    private _onValueChangedListeners: Array<(newValue: T) => void>;

    public constructor(defaultValue?: T) {
        super();
        this._value = defaultValue;
        this._label = 'unknown';
        this._hasLabel = false;
        this._labelElement = new LabelElement(this._label, this._description);
        this._onValueChangedListeners = [];
    }

    public setDefaultValue(value: T) {
        this._value = value;
        return this;
    }

    public setLabel(label: string) {
        this._hasLabel = true;
        this._label = label;
        this._labelElement = new LabelElement(this._label, this._description);
        return this;
    }

    public setDescription(text: string) {
        this._labelElement = new LabelElement(this._label, text);
        return this;
    }

    /**
     * Caches the current value.
     */
    public cacheValue() {
        this._cachedValue = this._value;
    }

    /**
     * Returns whether the value stored is different from the cached value.
     */
    public hasChanged() {
        return this._cachedValue !== this._value;
    }

    /**
     * Get the currently set value of this UI element.
     */
    public getValue(): T {
        ASSERT(this._value !== undefined, 'this._value is undefined');
        return this._value;
    }

    /**
     * Add a delegate that will be called when the value changes.
     */
    public addValueChangedListener(delegate: (newValue: T) => void) {
        this._onValueChangedListeners.push(delegate);
        return this;
    }

    public override finalise(): void {
        super.finalise();

        this._onValueChanged();
        this._onValueChangedListeners.forEach((listener) => {
            listener(this._value!);
        });
    }

    public override generateHTML() {
        return `
            ${this._labelElement.generateHTML()}
            <div class="prop-value-container">
                ${this._generateInnerHTML()}
            </div>
        `;
    }

    /**
     * The UI element that this label is describing.
     */
    protected abstract _generateInnerHTML(): string;

    protected override _onEnabledChanged() {
        if (this._hasLabel) {
            this._labelElement.setEnabled(this.getEnabled());
        }
    }

    /**
     * Set the value of this UI element.
     */
    protected _setValue(value: T) {
        this._value = value;

        this._onValueChanged();
        this._onValueChangedListeners.forEach((listener) => {
            listener(this._value!);
        });
    }

    /**
     * A delegate that is called when the value of this element changes.
     */
    protected abstract _onValueChanged(): void;
}
