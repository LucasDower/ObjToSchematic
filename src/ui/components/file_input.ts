import * as path from 'path';

import { ASSERT } from '../../util/error_util';
import { UIUtil } from '../../util/ui_util';
import { ConfigComponent } from './config';

export class FileComponent extends ConfigComponent<File, HTMLDivElement> {
    private _loadedFilePath: string;

    public constructor() {
        super();
        this._loadedFilePath = '';
    }

    protected override _generateInnerHTML() {
        return `
            <div class="input-file struct-prop" id="${this._getId()}">
                <input type="file" accept=".obj,,.glb" style="display: none;" id="${this._getId()}-input">
                ${this._loadedFilePath}
            </div>
        `;
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

        const inputElement = UIUtil.getElementById(this._getId() + '-input') as HTMLInputElement;

        inputElement.addEventListener('change', () => {
            const files = inputElement.files;
            if (files?.length === 1) {
                const file = files.item(0);
                ASSERT(file !== null);
                this._loadedFilePath = file.name;
                this._setValue(file);
            }
        });

        this._getElement().addEventListener('click', () => {
            if (this.enabled) {
                inputElement.click();
            }
        });
    }

    protected _onValueChanged(): void {
        this._updateStyles();
    }

    protected _onEnabledChanged(): void {
        super._onEnabledChanged();

        this._updateStyles();
    }

    protected override _updateStyles() {
        const parsedPath = path.parse(this._loadedFilePath);
        this._getElement().innerHTML = parsedPath.name + parsedPath.ext;

        UIUtil.updateStyles(this._getElement(), {
            isHovered: this.hovered,
            isEnabled: this.enabled,
            isActive: false,
        });
    }
}
