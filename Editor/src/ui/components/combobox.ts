import { TTranslationMap } from '../../../loc/base';
import { DeepLeafKeys, LOC } from '../../localiser';
import { UIUtil } from '../../util/ui_util';
import { AppIcons } from '../icons';
import { HTMLBuilder } from '../misc';
import { ConfigComponent } from './config';

export type ComboBoxItem<T> = {
    payload: T,
    displayLocKey: DeepLeafKeys<TTranslationMap>,
} | {
    payload: T,
    displayText: string,
};

export class ComboboxComponent<T> extends ConfigComponent<T, HTMLSelectElement> {
    private _items: ComboBoxItem<T>[];

    public constructor() {
        super();
        this._items = [];
    }

    public addItems(items: ComboBoxItem<T>[]) {
        items.forEach((item) => {
            this.addItem(item);
        });
        return this;
    }

    public addItem(item: ComboBoxItem<T>) {
        if (this._items.length === 0) {
            this.setDefaultValue(item.payload);
        }

        this._items.push(item);
        //this._setValue(this._items[0].payload);
        return this;
    }

    public override registerEvents(): void {
        this._getElement().addEventListener('mouseenter', () => {
            this._setHovered(true);
            this._updateStyles();
        });

        this._getElement().addEventListener('mouseleave', () => {
            this._setHovered(false);
            this._updateStyles();
        });

        this._getElement().addEventListener('change', (e: Event) => {
            const selectedValue = this._items[this._getElement().selectedIndex].payload;
            this._setValue(selectedValue);
        });
    }

    public setOptionEnabled(index: number, enabled: boolean) {
        const option = UIUtil.getElementById(this._getId() + '-' + index) as HTMLOptionElement;
        option.disabled = !enabled;
    }

    public override _generateInnerHTML() {
        const builder = new HTMLBuilder();

        builder.add('<div style="position: relative; width: 100%;">');
        builder.add(`<select class="struct-prop" name="${this._getId()}" id="${this._getId()}">`);
        this._items.forEach((item, index) => {
            if ('displayLocKey' in item) {
                builder.add(`<option id="${this._getId()}-${index}" value="${item.payload}">${LOC(item.displayLocKey)}</option>`);
            } else {
                builder.add(`<option id="${this._getId()}-${index}" value="${item.payload}">${item.displayText}</option>`);
            }
        });
        builder.add('</select>');

        builder.add(`<div id="${this._getId()}-arrow" class="checkbox-arrow">`);
        builder.add(AppIcons.ARROW_DOWN);
        builder.add(`</div>`);
        builder.add('</div>');

        return builder.toString();
    }

    protected _onValueChanged(): void {
        super._onValueChanged();
    }

    protected _onEnabledChanged(): void {
        super._onEnabledChanged();
        this._getElement().disabled = this.disabled;
        this._updateStyles();
    }

    protected override _updateStyles(): void {
        UIUtil.updateStyles(this._getElement(), {
            isHovered: this.hovered,
            isEnabled: this.enabled,
            isActive: false,
        });

        const arrowElement = UIUtil.getElementById(this._getId() + '-arrow');
        arrowElement.classList.remove('text-dark');
        arrowElement.classList.remove('text-standard');
        arrowElement.classList.remove('text-light');
        if (this.enabled) {
            if (this.hovered) {
                arrowElement.classList.add('text-light');
            } else {
                arrowElement.classList.add('text-standard');
            }
        } else {
            arrowElement.classList.add('text-dark');
        }
    }

    public override finalise(): void {
        super.finalise();

        const selectedIndex = this._items.findIndex((item) => item.payload === this.getValue());
        const element = this._getElement();

        element.selectedIndex = selectedIndex;

        this._updateStyles();
    }

    public override refresh(): void {
        super.refresh();

        this._items.forEach((item, index) => {
            if ('displayLocKey' in item) {
                const element = UIUtil.getElementById(this._getId() + '-' + index) as HTMLOptionElement;
                element.text = LOC(item.displayLocKey);
            }
        });
    }

    public setValue(value: T) {
        this._setValue(value);
    }
}
