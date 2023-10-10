import { PALETTE_ALL_RELEASE } from '../../../res/palettes/all';
import { LOC } from '../../localiser';
import { AppUtil } from '../../../../Core/src/util';
import { ASSERT } from '../../../../Core/src/util/error_util';
import { download } from '../../util/file_util';
import { UIUtil } from '../../util/ui_util';
import { AppConsole } from '../console';
import { AppIcons } from '../icons';
import { CheckboxComponent } from './checkbox';
import { ConfigComponent } from './config';
import { ToolbarItemComponent } from './toolbar_item';
import { BlockPalette } from '../../../../Core/src/util/type_util';

export class PaletteComponent extends ConfigComponent<BlockPalette, HTMLDivElement> {
    private _checkboxes: { block: string, element: CheckboxComponent }[];
    private _palette: BlockPalette;
    private _selectAll: ToolbarItemComponent;
    private _deselectAll: ToolbarItemComponent;
    private _importFrom: ToolbarItemComponent;
    private _exportTo: ToolbarItemComponent;

    public constructor() {
        super();

        this._palette = new Set(PALETTE_ALL_RELEASE);
        this._setValue(this._palette);

        this._checkboxes = [];
        PALETTE_ALL_RELEASE.forEach((block) => {
            this._checkboxes.push({
                block: block,
                element: new CheckboxComponent()
                    .setDefaultValue(true)
                    .setUnlocalisedCheckedText(block)
                    .setUnlocalisedUncheckedText(block),
            });
        });

        this._selectAll = new ToolbarItemComponent({ iconSVG: AppIcons.SELECT_ALL, id: 'select-all' })
            .onClick(() => {
                this._checkboxes.forEach((checkbox) => {
                    checkbox.element.check();
                });
                this._onCountSelectedChanged();
            });


        this._deselectAll = new ToolbarItemComponent({ iconSVG: AppIcons.DESELECT_ALL, id: 'deselect-all' })
            .onClick(() => {
                this._checkboxes.forEach((checkbox) => {
                    checkbox.element.uncheck();
                });
                this._onCountSelectedChanged();
            });

        this._importFrom = new ToolbarItemComponent({ iconSVG: AppIcons.IMPORT, id: 'import' })
            .onClick(() => {
                const a = document.createElement('input');
                a.setAttribute('type', 'file');
                a.setAttribute('accept', '.txt');

                a.addEventListener('change', () => {
                    const files = a.files;
                    if (files?.length === 1) {
                        const file = files.item(0);
                        ASSERT(file !== null);
                        AppConsole.info(LOC('assign.reading_palette', { file_name: file.name }));
                        file.text().then((text) => {
                            this._onReadPaletteFile(text);
                        });
                    }
                });

                a.click();
            });

        this._exportTo = new ToolbarItemComponent({ iconSVG: AppIcons.EXPORT, id: 'export' })
            .onClick(() => {
                const textPalette = this._checkboxes.filter((x) => x.element.getValue())
                    .map((x) => x.block)
                    .join('\n');
                download(textPalette, 'block-palette.txt');
            });
    }

    private _onCountSelectedChanged() {
        const countSelected = this.getValue().size;

        this._deselectAll.setEnabled(this.enabled && countSelected > 0);
        this._selectAll.setEnabled(this.enabled && countSelected < PALETTE_ALL_RELEASE.length);
    }

    private _onReadPaletteFile(text: string) {
        const blockNames = text.split('\n');

        let countDeselected = 0;
        this._checkboxes.forEach((checkbox) => {
            if (checkbox.element.getValue()) {
                checkbox.element.uncheck();
                ++countDeselected;
            }
        });
        AppConsole.info(LOC('assign.deselected_blocks', { count: countDeselected }));

        let countFound = 0;
        let countChecked = 0;
        blockNames.forEach((blockName) => {
            blockName = blockName.trim();
            if (blockName.length === 0) {
                return;
            }
            ++countFound;

            if (!AppUtil.Text.isNamespacedBlock(blockName)) {
                AppConsole.error(LOC('assign.block_not_namespaced', { block_name: blockName }));
            } else {
                const checkboxIndex = this._checkboxes.findIndex((x) => x.block === blockName);
                if (checkboxIndex === -1) {
                    AppConsole.error(LOC('assign.could_not_use_block', { block_name: blockName }));
                } else {
                    this._checkboxes[checkboxIndex].element.check();
                    ++countChecked;
                }
            }
        });

        AppConsole.info(LOC('assign.found_blocks', { count: countFound }));
        AppConsole.info(LOC('assign.selected_blocks', { count: countChecked }));

        this._onCountSelectedChanged();
    }

    protected override _generateInnerHTML(): string {
        let checkboxesHTML = '';
        this._checkboxes.forEach((checkbox) => {
            checkboxesHTML += `<div class="col-container" id="${this._getId() + '-block-' + checkbox.block}">`;
            checkboxesHTML += checkbox.element._generateInnerHTML();
            checkboxesHTML += '</div>';
        });

        return `
            <div class="row-container" style="width: 100%; gap: 5px;">
                <input class="struct-prop" type="text" style="width: 100%; text-align: start;" placeholder="${LOC('assign.components.search')}" id="${this._getId() + '-search'}"></input>
                <div class="col-container header-cols" style="padding-top: 0px;">
                    <div class="col-container">
                        <div class="col-item">
                            ${this._importFrom.generateHTML()}
                        </div>
                        <div class="col-item">
                            ${this._exportTo.generateHTML()}
                        </div>
                    </div>
                    <div class="col-container">
                        <div class="col-item">
                            ${this._selectAll.generateHTML()}
                        </div>
                        <div class="col-item">
                            ${this._deselectAll.generateHTML()}
                        </div>
                    </div>
                </div>
                <div class="row-container" style="gap: 5px; border-radius: 5px; width: 100%; height: 200px; overflow-y: auto; overflow-x: hidden;" id="${this._getId() + '-list'}">
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
        this._importFrom.setEnabled(this.enabled);
        this._exportTo.setEnabled(this.enabled);

        this._onCountSelectedChanged();
        this._updateStyles();
    }

    public override registerEvents(): void {
        const searchElement = UIUtil.getElementById(this._getId() + '-search') as HTMLInputElement;
        searchElement.addEventListener('keyup', () => {
            this._onSearchBoxChanged(searchElement.value);
        });
        searchElement.addEventListener('mouseenter', () => {
            this._setHovered(true);
            this._updateStyles();
        });
        searchElement.addEventListener('mouseleave', () => {
            this._setHovered(false);
            this._updateStyles();
        });

        this._checkboxes.forEach((checkbox) => {
            checkbox.element.registerEvents();
            checkbox.element.addValueChangedListener(() => {
                const isTicked = checkbox.element.getValue();
                if (isTicked) {
                    this._palette.add(checkbox.block);
                } else {
                    this._palette.delete(checkbox.block);
                }
                this._onCountSelectedChanged();
            });
        });

        this._selectAll.registerEvents();
        this._deselectAll.registerEvents();
        this._importFrom.registerEvents();
        this._exportTo.registerEvents();
    }

    public override finalise(): void {
        super.finalise();

        this._checkboxes.forEach((checkbox) => {
            checkbox.element.finalise();
        });

        this._selectAll.finalise();
        this._deselectAll.finalise();
        this._importFrom.finalise();
        this._exportTo.finalise();

        this._onCountSelectedChanged();

        this._updateStyles();
        //this._selectAll.finalise();
        //this._deselectAll.finalise();
        //this._importFrom.finalise();
        //this._exportTo.finalise();
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

    protected override _updateStyles(): void {
        UIUtil.updateStyles(UIUtil.getElementById(this._getId() + '-search'), {
            isActive: false,
            isEnabled: this.enabled,
            isHovered: this.hovered,
        });
    }

    public override refresh(): void {
        super.refresh();

        const element = UIUtil.getElementById(this._getId() + '-search') as HTMLInputElement;
        element.placeholder = LOC('assign.components.search');
    }
}
