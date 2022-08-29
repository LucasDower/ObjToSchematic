import { AppTypes } from '../../util';
import { ToggleableElement } from '../toggleable';
import { BaseUIElement } from './base';
import { ToggleableIcon } from './toggleable_icon';

export class PaletteElement extends BaseUIElement<AppTypes.TNamespacedBlockName[]> {
    private _items: ToggleableElement<AppTypes.TNamespacedBlockName>[];

    public constructor() {
        super();

        this._items = [];

        /*
        for (let i = 0; i < 16; ++i) {
            // TODO: Change IDs here
            const item = new ToggleableIcon('C:\\Users\\Lucas\\Desktop\\stone.png', 32, false, 'minecraft:stone');
            item.registerOnActiveChanged(() => {
                this._value = this._items
                    .filter((item) => { return item.getIsActive(); })
                    .map((item) => { return item.getValue(); });
            });
            this._items.push(item);
        }
        */
    }

    public setItems(items: ToggleableElement<AppTypes.TNamespacedBlockName>[]) {
        this._items = items;

        this._updateHTML();

        this._items.forEach((item) => {
            item.registerEvents();
        });
    }

    private _updateHTML() {
        this.getElement().innerHTML = this._getHTML();
    }

    private _getHTML() {
        let itemsHTML: string = '';
        for (let i = 0; i < this._items.length; ++i) {
            itemsHTML += this._items[i].generateHTML();
        }

        return `
            <div class="item-body-sunken">
                <div class="palette-container">
                    ${itemsHTML}
                </div>
            </div>
        `;
    }

    public generateHTML(): string {
        return `
            <div class="prop-right" id="${this._id}">
                ${this._getHTML()}
            </div>
        `;
    }

    public registerEvents(): void {
        this._items.forEach((item) => {
            item.registerEvents();
        });
    }

    protected _onEnabledChanged(): void {

    }
}
