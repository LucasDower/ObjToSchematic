import { getRandomID } from '../../util';
import { ASSERT } from '../../util/error_util';

export class LabelElement {
    private _id: string;
    private _text: string;
    private _description?: string;

    constructor(text: string, description?: string) {
        this._id = getRandomID();
        this._text = text;
        this._description = description;
    }

    public generateHTML(): string {
        if (this._description === undefined) {
            return `
                <div class="prop-key-container" id="${this._id}">
                    ${this._text}
                </div>
            `;
        } else {
            return `
                <div class="prop-key-container" id="${this._id}">
                    <abbr title="${this._description}">${this._text}</abbr>
                </div>
            `;
        }
    }

    public setEnabled(isEnabled: boolean) {
        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null);

        if (isEnabled) {
            element.classList.remove('prop-key-container-disabled');
        } else {
            element.classList.add('prop-key-container-disabled');
        }
    }
}
