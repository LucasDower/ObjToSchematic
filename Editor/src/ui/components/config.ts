import { ASSERT } from 'ots-core/src/util/util';
import { TTranslationMap } from '../../loc/base';
import { DeepLeafKeys, LOC, TLocalisedString } from '../../localiser';
import { UIUtil } from '../../util/ui_util';
import { AppIcons } from '../icons';
import { BaseComponent } from './base';

/**
 * A `ConfigComponent` is a UI element that has a value the user can change.
 * For example, sliders, comboboxes and checkboxes are `ConfigComponent`.
 */
export abstract class ConfigComponent<T, F> extends BaseComponent<F> {
    private _labelLocalisedKey?: string;
    protected _label: TLocalisedString;
    private _value?: T;
    private _onValueChangedListeners: Array<(newValue: T) => void>;
    private _onEnabledChangedListeners: Array<(isEnabled: boolean) => void>;
    private _canMinimise: boolean;

    public constructor(defaultValue?: T) {
        super();
        this._value = defaultValue;
        this._label = '' as TLocalisedString;
        this._onValueChangedListeners = [];
        this._onEnabledChangedListeners = [];
        this._canMinimise = false;
    }

    public setDefaultValue(value: T) {
        this._value = value;
        return this;
    }

    public setLabel<P extends DeepLeafKeys<TTranslationMap>>(p: P) {
        this._labelLocalisedKey = p;
        this._label = LOC(p);
        return this;
    }

    public setUnlocalisedLabel(p: string) {
        this._label = p as TLocalisedString;
        return this;
    }

    public refresh() {
        this._updateLabel();

        //const outer = UIUtil.getElementById(`${this._getId()}-prop`);
        //outer.innerHTML = this._generateInnerHTML();
    }

    private _updateLabel() {
        if (this._labelLocalisedKey !== undefined) {
            ASSERT(this._labelLocalisedKey !== undefined, `Missing localisation key ${this._label}`);
            this._label = LOC(this._labelLocalisedKey as any);

            const labelElement = UIUtil.getElementById(this._getLabelId());
            labelElement.innerHTML = this._label;
        }
    }

    /*
    public setLabel(label: TLocalisedString) {
        this._label = label;
        return this;
    }
    */

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
        if (this._canMinimise) {
            const minimiserElement = UIUtil.getElementById(this._getId() + '-minimiser') as HTMLDivElement;
            const labelElement = UIUtil.getElementById(this._getLabelId()) as HTMLDivElement;
            const propElement = UIUtil.getElementById(this._getId() + '-prop') as HTMLDivElement;

            labelElement.addEventListener('click', () => {
                propElement.classList.toggle('hide');
                if (propElement.classList.contains('hide')) {
                    minimiserElement.innerHTML = AppIcons.ARROW_RIGHT;
                } else {
                    minimiserElement.innerHTML = AppIcons.ARROW_DOWN;
                }
            });

            labelElement.addEventListener('mouseenter', () => {
                if (this.enabled) {
                    labelElement.style.color = '#d9d9d9';
                }
                labelElement.style.cursor = 'pointer';
            });

            labelElement.addEventListener('mouseleave', () => {
                labelElement.style.color = '';
                labelElement.style.cursor = '';
            });
        }

        super.finalise();

        /*
        this._onValueChanged();
        this._onValueChangedListeners.forEach((listener) => {
            listener(this._value!);
        });
        */
    }

    public setCanMinimise() {
        this._canMinimise = true;
        return this;
    }

    public override generateHTML() {
        return `
            <div class="property">
                <div class="prop-key-container" id="${this._getLabelId()}">
                    ${this._label}
                    ${this._canMinimise ? `<div style="display: flex;" id="${this._getId()}-minimiser">${AppIcons.ARROW_DOWN}</div>` : ''}
                </div>
                <div class="prop-value-container" id="${this._getId()}-prop">
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
