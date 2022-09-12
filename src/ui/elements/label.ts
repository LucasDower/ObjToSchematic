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
        const description = this._description ? `<br><div style="font-weight: 300; font-size: 85%; color: var(--text-disabled);">
            ${this._description}
        </div>` : '';
        return `
            <div class="prop-left" id="${this._id}">
                ${this._text}${description}
            </div>
        `;
    }

    public setEnabled(isEnabled: boolean) {
        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null);

        if (isEnabled) {
            element.classList.remove('prop-left-disabled');
        } else {
            element.classList.add('prop-left-disabled');
        }
    }
}
