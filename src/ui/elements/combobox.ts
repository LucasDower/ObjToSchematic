import { ASSERT } from '../../util/error_util';
import { ConfigElement } from './config_element';

export type ComboBoxItem<T> = {
    payload: T;
    displayText: string; // TODO: Should be TLocString
    tooltip?: string;
}

export class ComboBoxElement<T> extends ConfigElement<T, HTMLSelectElement> {
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
        this._items.push(item);
        this._setValue(this._items[0].payload);
        return this;
    }

    public generateInnerHTML() {
        ASSERT(this._items.length > 0);

        let itemsHTML = '';
        for (const item of this._items) {
            itemsHTML += `<option value="${item.payload}" title="${item.tooltip || ''}">${item.displayText}</option>`;
        }

        return `
            <select name="${this._getId()}" id="${this._getId()}">
                ${itemsHTML}
            </select>
        `;
    }

    public registerEvents(): void {
        this._getElement().addEventListener('onchange', (e: Event) => {
            const selectedValue = this._items[this._getElement().selectedIndex].payload;
            this._setValue(selectedValue);
        });
    }

    protected _onEnabledChanged() {
        super._onEnabledChanged();
        this._getElement().disabled = !this._getIsEnabled();
    }
}
