import { LabelledElement } from './labelled_element';
import { ASSERT } from '../../util';

export type ComboBoxItem<T> = {
    id: T;
    displayText: string;
    tooltip?: string;
}

export class ComboBoxElement<T> extends LabelledElement<T> {
    private _items: ComboBoxItem<T>[];

    public constructor(id: string, items: ComboBoxItem<T>[]) {
        super(id);
        this._items = items;
    }

    public generateInnerHTML() {
        let itemsHTML = '';
        for (const item of this._items) {
            itemsHTML += `<option value="${item.id}" title="${item.tooltip || ''}">${item.displayText}</option>`;
        }

        return `
            <select name="${this._id}" id="${this._id}">
                ${itemsHTML}
            </select>
        `;
    }

    public registerEvents(): void {
        this.getElement().addEventListener('change', () => {
            this._onSelectedChangedDelegates.forEach((delegate) => {
                delegate();
            });
        });
    }

    public getValue() {
        const element = document.getElementById(this._id) as HTMLSelectElement;
        ASSERT(element !== null);
        return this._items[element.selectedIndex].id;
    }

    protected _onEnabledChanged() {
        super._onEnabledChanged();

        const element = document.getElementById(this._id) as HTMLSelectElement;
        ASSERT(element !== null);
        element.disabled = !this._isEnabled;
    }

    private _onSelectedChangedDelegates: Array<() => void> = [];
    public addOnSelectedChangedListener(delegate: () => void) {
        this._onSelectedChangedDelegates.push(delegate);
    }
}
