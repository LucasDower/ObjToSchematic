import { ASSERT } from '../../../tools/misc';
import { LOC } from '../../localise';
import { TLocString } from '../../util/type_util';
import { BaseUIElement } from './base_element';
import { LabelElement } from './label';

export abstract class ConfigElement<T, F> extends BaseUIElement<F> {
    private _label: TLocString;
    private _description?: TLocString;
    private _labelElement: LabelElement;
    private _value?: T;

    public constructor(defaultValue?: T) {
        super();
        this._value = defaultValue;
        this._label = LOC.t('common.unknown');
        this._labelElement = new LabelElement(this._label, this._description);
    }

    public setLabel(label: TLocString) {
        this._label = label;
        this._labelElement = new LabelElement(this._label, this._description);
        return this;
    }

    public setDescription(text: TLocString) {
        this._labelElement = new LabelElement(this._label, text);
        return this;
    }

    public generateHTML() {
        return `
            ${this._labelElement.generateHTML()}
            <div class="prop-right">
                ${this.generateInnerHTML()}
            </div>
        `;
    }

    /**
     * The UI element that this label is describing.
     */
    protected abstract generateInnerHTML(): string;

    protected _onEnabledChanged() {
        this._labelElement.setEnabled(this._getIsEnabled());
    }

    /**
     * Get the currently set value of this UI element.
     */
    public getValue(): T {
        ASSERT(this._value !== undefined, 'Called getValue when not set');
        return this._value!;
    }

    /**
     * Set the value of this UI element.
     */
    protected _setValue(value: T) {
        this._value = value;
    }
}
