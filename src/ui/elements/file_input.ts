import { BaseUIElement } from '../layout';
import { assert } from '../../util';

import { remote } from 'electron';
import * as path from 'path';

export class FileInputElement extends BaseUIElement {
    private _fileExtension: string;
    private _loadedFilePath: string;

    public constructor(id: string, fileExtension: string) {
        super(id);
        this._fileExtension = fileExtension;
        this._loadedFilePath = '';
    }

    public generateHTML() {
        return `
            <div class="input-text" id="${this._id}">
                ${this._loadedFilePath}
            </div>
        `;
    }

    public registerEvents(): void {
        const element = document.getElementById(this._id) as HTMLDivElement;
        assert(element !== null);

        element.onclick = () => {
            if (!this._isEnabled) {
                return;
            }

            const files = remote.dialog.showOpenDialogSync({
                title: 'Load file',
                buttonLabel: 'Load',
                filters: [{
                    name: 'Waveform obj file',
                    extensions: [`${this._fileExtension}`],
                }],
            });
            if (files && files.length === 1) {
                const filePath = files[0];
                this._loadedFilePath = filePath;
            } else {
                this._loadedFilePath = '';
            }
            const parsedPath = path.parse(this._loadedFilePath);
            element.innerHTML = parsedPath.name + parsedPath.ext;
        };
    }

    public getValue() {
        return this._loadedFilePath;
    }

    protected _onEnabledChanged() {
        const element = document.getElementById(this._id) as HTMLDivElement;
        assert(element !== null);

        if (this._isEnabled) {
            // element.classList.add("button");
            element.classList.remove('input-text-disabled');
        } else {
            element.classList.add('input-text-disabled');
            // element.classList.remove("button");
        }
    }
}
