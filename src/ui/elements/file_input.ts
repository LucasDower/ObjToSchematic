import * as path from 'path';

import { ASSERT } from '../../util/error_util';
import { UIUtil } from '../../util/ui_util';
import { ConfigUIElement } from './config_element';

export class FileInputElement extends ConfigUIElement<Promise<string>, HTMLDivElement> {
    private _fileExtensions: string[];
    private _loadedFilePath: string;
    private _hovering: boolean;

    public constructor() {
        super(Promise.resolve(''));
        this._fileExtensions = [];
        this._loadedFilePath = '';
        this._hovering = false;
    }

    /**
     * Set the allow list of file extensions that can be uploaded.
     */
    public setFileExtensions(extensions: string[]) {
        this._fileExtensions = extensions;
        return this;
    }

    protected override _generateInnerHTML() {
        return `
            <div class="input-file" id="${this._getId()}">
                <input type="file" accept=".obj" style="display: none;" id="${this._getId()}-input">
                ${this._loadedFilePath}
            </div>
        `;
    }

    public override registerEvents(): void {
        this._getElement().addEventListener('mouseenter', () => {
            this._hovering = true;
            this._updateStyle();
        });

        this._getElement().addEventListener('mouseleave', () => {
            this._hovering = false;
            this._updateStyle();
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
            if (!this.getEnabled()) {
                return;
            }

            inputElement.click();
        });

        this._getElement().addEventListener('mousemove', () => {
            this._updateStyle();
        });
    }

    protected override _onEnabledChanged() {
        super._onEnabledChanged();

        if (this.getEnabled()) {
            this._getElement().classList.remove('input-file-disabled');
        } else {
            this._getElement().classList.add('input-file-disabled');
        }
    }

    protected override _onValueChanged(): void {
        const parsedPath = path.parse(this._loadedFilePath);
        this._getElement().innerHTML = parsedPath.name + parsedPath.ext;
    }

    private _updateStyle() {
        this._getElement().classList.remove('input-file-disabled');
        this._getElement().classList.remove('input-file-hover');

        if (this.getEnabled()) {
            if (this._hovering) {
                this._getElement().classList.add('input-file-hover');
            }
        } else {
            this._getElement().classList.add('input-file-disabled');
        }
    }
}
