import { LabelledElement } from './labelled_element';
import { ASSERT } from "../../util/error_util";

import { remote } from 'electron';
import * as path from 'path';

export class FileInputElement extends LabelledElement<string> {
    private _fileExtension: string;
    private _loadedFilePath: string;
    private _hovering: boolean;

    public constructor(label: string, fileExtension: string) {
        super(label);
        this._fileExtension = fileExtension;
        this._loadedFilePath = '';
        this._hovering = false;
    }

    public generateInnerHTML() {
        return `
            <div class="input-text" id="${this._id}">
                ${this._loadedFilePath}
            </div>
        `;
    }

    public registerEvents(): void {
        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null);

        element.onmouseenter = () => {
            this._hovering = true;
        }

        element.onmouseleave = () => {
            this._hovering = false;
        }

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
                this._value = filePath;
            } else {
                this._loadedFilePath = '';
                this._value = '';
            }
            const parsedPath = path.parse(this._loadedFilePath);
            element.innerHTML = parsedPath.name + parsedPath.ext;
        };

        document.onmousemove = () => {
            element.classList.remove('input-text-disabled');
            element.classList.remove('input-text-hover');

            if (this._isEnabled) {
                if (this._hovering) {
                    element.classList.add('input-text-hover');
                }
            } else {
                element.classList.add('input-text-disabled');
            }
        }
    }

    protected _onEnabledChanged() {
        super._onEnabledChanged();

        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null);

        if (this._isEnabled) {
            element.classList.remove('input-text-disabled');
        } else {
            element.classList.add('input-text-disabled');
        }
    }
}
