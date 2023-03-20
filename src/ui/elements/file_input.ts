import * as path from 'path';

import { ASSERT } from '../../util/error_util';
import { UIUtil } from '../../util/ui_util';
import { ConfigUIElement } from './config_element';

export class ObjFileInputElement extends ConfigUIElement<Promise<string>, HTMLDivElement> {
    private _loadedFilePath: string;

    public constructor() {
        super(Promise.resolve(''));
        this._loadedFilePath = '';
    }

    protected override _generateInnerHTML() {
        return `
            <div class="input-file struct-prop" id="${this._getId()}">
                <input type="file" accept=".obj" style="display: none;" id="${this._getId()}-input">
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
                this._setValue(file.text());
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
