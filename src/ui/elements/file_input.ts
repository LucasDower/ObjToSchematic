import { remote } from 'electron';
import * as path from 'path';

import { ConfigElement } from './config_element';

export class FileInputElement extends ConfigElement<string, HTMLDivElement> {
    private _fileExtensions: string[];
    private _loadedFilePath: string;
    private _hovering: boolean;

    public constructor() {
        super('');
        this._fileExtensions = [];
        this._loadedFilePath = '';
        this._hovering = false;
    }

    public setFileExtensions(extensions: string[]) {
        this._fileExtensions = extensions;
        return this;
    }

    public generateInnerHTML() {
        return `
            <div class="input-text" id="${this._getId()}">
                ${this._loadedFilePath}
            </div>
        `;
    }

    public registerEvents(): void {
        this._getElement().addEventListener('mouseenter', () => {
            this._hovering = true;
            this._updateStyle();
        });

        this._getElement().addEventListener('mouseleave', () => {
            this._hovering = false;
            this._updateStyle();
        });

        this._getElement().addEventListener('click', () => {
            if (!this._getIsEnabled()) {
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
            if (files && files.length === 1) {
                const filePath = files[0];
                this._loadedFilePath = filePath;
                this._setValue(filePath);
            }
            const parsedPath = path.parse(this._loadedFilePath);
            this._getElement().innerHTML = parsedPath.name + parsedPath.ext;
        });

        this._getElement().addEventListener('mousemove', () => {
            this._updateStyle();
        });
    }

    private _updateStyle() {
        this._getElement().classList.remove('input-text-disabled');
        this._getElement().classList.remove('input-text-hover');

        if (this._getIsEnabled()) {
            if (this._hovering) {
                this._getElement().classList.add('input-text-hover');
            }
        } else {
            this._getElement().classList.add('input-text-disabled');
        }
    }

    protected _onEnabledChanged() {
        super._onEnabledChanged();

        if (this._getIsEnabled()) {
            this._getElement().classList.remove('input-text-disabled');
        } else {
            this._getElement().classList.add('input-text-disabled');
        }
    }
}
