import { ASSERT } from '../../util/error_util';
import { ConfigUIElement } from './config_element';

export type ComboBoxItem<T> = {
    payload: T;
    displayText: string;
    tooltip?: string;
}

export class ComboBoxElement<T> extends ConfigUIElement<T, HTMLSelectElement> {
    private _items: ComboBoxItem<T>[];
    private _small: boolean;

    public constructor() {
        super();
        this._items = [];
        this._small = false;
    }

    public addItems(items: ComboBoxItem<T>[]) {
        items.forEach((item) => {
            this.addItem(item);
        });
        return this;
    }

    public addItem(item: ComboBoxItem<T>) {
        this._items.push(item);
        this._setValue(this._items[0].payload);
        return this;
    }

    public setSmall() {
        this._small = true;
        return this;
    }

    public override registerEvents(): void {
        this._getElement().addEventListener('onchange', (e: Event) => {
            const selectedValue = this._items[this._getElement().selectedIndex].payload;
            this._setValue(selectedValue);
        });
    }

    public override _generateInnerHTML() {
        ASSERT(this._items.length > 0);

        let itemsHTML = '';
        for (const item of this._items) {
            itemsHTML += `<option value="${item.payload}" title="${item.tooltip || ''}">${item.displayText}</option>`;
        }

        return `
            <select class="${this._small ? 'height-small' : 'height-normal'}" name="${this._getId()}" id="${this._getId()}">
                ${itemsHTML}
            </select>
        `;
    }

    protected override _onEnabledChanged() {
        super._onEnabledChanged();

        this._getElement().disabled = !this.getEnabled();
    }

    protected override _onValueChanged(): void {
    }
}
