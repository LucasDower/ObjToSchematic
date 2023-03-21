import { ASSERT } from '../../util/error_util';
import { BaseComponent } from './base';

/**
 * A `ConfigComponent` is a UI element that has a value the user can change.
 * For example, sliders, comboboxes and checkboxes are `ConfigComponent`.
 */
export abstract class ConfigComponent<T, F> extends BaseComponent<F> {
    protected _label: string;
    private _value?: T;
    private _cachedValue?: T;
    private _onValueChangedListeners: Array<(newValue: T) => void>;
    private _onEnabledChangedListeners: Array<(isEnabled: boolean) => void>;

    public constructor(defaultValue?: T) {
        super();
        this._value = defaultValue;
        this._label = '';
        this._onValueChangedListeners = [];
        this._onEnabledChangedListeners = [];
    }

    public setDefaultValue(value: T) {
        this._value = value;
        return this;
    }

    public setLabel(label: string) {
        this._label = label;
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

    /**
     * Add a delegate that will be called when the value changes.
     */
    public addEnabledChangedListener(delegate: (isEnabled: boolean) => void) {
        this._onEnabledChangedListeners.push(delegate);
        return this;
    }

    public override finalise(): void {
        super.finalise();

        /*
        this._onValueChanged();
        this._onValueChangedListeners.forEach((listener) => {
            listener(this._value!);
        });
        */
    }

    public override generateHTML() {
        return `
            <div class="property">
                <div class="prop-key-container" id="${this._getLabelId()}">
                    ${this._label}
                </div>
                <div class="prop-value-container">
                    ${this._generateInnerHTML()}
                </div>
            </div>
        `;
    }

    /**
     * The UI element that this label is describing.
     */
    protected abstract _generateInnerHTML(): string;

    protected override _onEnabledChanged() {
        const label = document.getElementById(this._getLabelId()) as (HTMLDivElement | null);

        if (this.enabled) {
            label?.classList.remove('text-dark');
            label?.classList.add('text-standard');
        } else {
            label?.classList.add('text-dark');
            label?.classList.remove('text-standard');
        }

        this._onEnabledChangedListeners.forEach((listener) => {
            listener(this.getEnabled());
        });
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
    protected _onValueChanged(): void {
    }

    protected _getLabelId() {
        return this._getId() + '_label';
    }
}
