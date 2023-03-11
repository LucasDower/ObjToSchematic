import { PALETTE_ALL_RELEASE } from '../../../res/palettes/all';
import { Palette } from '../../palette';
import { AppUtil } from '../../util';
import { UIUtil } from '../../util/ui_util';
import { ButtonElement } from './button';
import { CheckboxElement } from './checkbox';
import { FullConfigUIElement } from './full_config_element';

export class PaletteElement extends FullConfigUIElement<Palette, HTMLDivElement> {
    private _checkboxes: { block: string, element: CheckboxElement }[];
    private _palette: Palette;
    private _selectAll: ButtonElement;
    private _deselectAll: ButtonElement;

    public constructor() {
        super();

        this._palette = Palette.create();
        this._palette.add(PALETTE_ALL_RELEASE);
        this._setValue(this._palette);

        this._checkboxes = [];
        PALETTE_ALL_RELEASE.forEach((block) => {
            this._checkboxes.push({
                block: block,
                element: new CheckboxElement()
                    .setDefaultValue(true)
                    .setCheckedText(block)
                    .setUncheckedText(block),
            });
        });

        this._selectAll = new ButtonElement()
            .setLabel('Select All')
            .setOnClick(() => {
                this._checkboxes.forEach((checkbox) => {
                    checkbox.element.check();
                });
            });


        this._deselectAll = new ButtonElement()
            .setLabel('Deselect All')
            .setOnClick(() => {
                this._checkboxes.forEach((checkbox) => {
                    checkbox.element.uncheck();
                });
            });
    }

    protected override _generateInnerHTML(): string {
        let checkboxesHTML = '';
        this._checkboxes.forEach((checkbox) => {
            checkboxesHTML += `<div class="col-container" id="${this._getId() + '-block-' + checkbox.block}">`;
            checkboxesHTML += checkbox.element._generateInnerHTML();
            checkboxesHTML += '</div>';
        });

        /*
        <select>
            <option value="All">All</option>
        </select>
        */

        return `
            <div class="row-container" style="width: 100%; gap:">

                <input type="text" style="width: 100%;" placeholder="Search..." id="${this._getId() + '-search'}"></input>
                <div class="col-container" style="padding: 5px 0px;">
                    ${this._selectAll.generateHTML()}
                    ${this._deselectAll.generateHTML()}
                </div>
                <div class="row-container" style="border-radius: 5px; width: 100%; height: 200px; overflow-y: auto; overflow-x: hidden;" id="${this._getId() + '-list'}">
                    ${checkboxesHTML}
                </div>
            </div>
        `;
    }

    protected override _onValueChanged(): void {
    }

    protected override _onEnabledChanged(): void {
        super._onEnabledChanged();

        const searchElement = UIUtil.getElementById(this._getId() + '-search') as HTMLInputElement;
        searchElement.disabled = !this.enabled;

        this._checkboxes.forEach((checkbox) => {
            checkbox.element.setEnabled(this.getEnabled());
        });

        this._selectAll.setEnabled(this.enabled);
        this._deselectAll.setEnabled(this.enabled);
    }

    public override registerEvents(): void {
        const searchElement = UIUtil.getElementById(this._getId() + '-search') as HTMLInputElement;
        searchElement.addEventListener('keyup', () => {
            this._onSearchBoxChanged(searchElement.value);
        });

        this._checkboxes.forEach((checkbox) => {
            checkbox.element.registerEvents();
            checkbox.element.addValueChangedListener(() => {
                const isTicked = checkbox.element.getValue();
                if (isTicked) {
                    this._palette.add([checkbox.block]);
                    console.log(this._palette.count());
                } else {
                    this._palette.remove(checkbox.block);
                    console.log(this._palette.count());
                }
            });
        });

        this._selectAll.registerEvents();
        this._deselectAll.registerEvents();
    }

    public override finalise(): void {
        this._checkboxes.forEach((checkbox) => {
            checkbox.element.finalise();
        });

        this._selectAll.finalise();
        this._deselectAll.finalise();
    }

    private _onSearchBoxChanged(search: string) {
        this._checkboxes.forEach((checkbox) => {
            const row = UIUtil.getElementById(this._getId() + '-block-' + checkbox.block);
            if (checkbox.block.toLocaleLowerCase().includes(search.toLowerCase()) || checkbox.block.toLowerCase().replace(/_/g, ' ').includes(search.toLocaleLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }
}
