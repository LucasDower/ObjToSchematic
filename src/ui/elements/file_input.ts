import { remote } from 'electron';
import * as path from 'path';

import { ConfigUIElement } from './config_element';

export class FileInputElement extends ConfigUIElement<string, HTMLDivElement> {
    private _fileExtensions: string[];
    private _loadedFilePath: string;
    private _hovering: boolean;

    public constructor() {
        super('');
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

        this._getElement().addEventListener('click', () => {
            if (!this.getEnabled()) {
                return;
            }

            const files = remote.dialog.showOpenDialogSync({
                title: 'Load file',
                buttonLabel: 'Load',
                filters: [{
                    name: 'Model file',
                    extensions: this._fileExtensions,
                }],
            });

            if (files && files[0] !== undefined) {
                const filePath = files[0];
                this._loadedFilePath = filePath;
                this._setValue(filePath);
            }
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
