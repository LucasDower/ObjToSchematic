import { assert } from '../../util';

export class LabelElement {
    private _id: string;
    private _text: string;

    constructor(id: string, text: string) {
        this._id = id;
        this._text = text;
    }

    public generateHTML(): string {
        return `
            <div class="sub-left" id="${this._id}">
                ${this._text}
            </div>
        `;
    }

    public setEnabled(isEnabled: boolean) {
        const element = document.getElementById(this._id) as HTMLDivElement;
        assert(element !== null);

        if (isEnabled) {
            element.classList.remove('sub-left-disabled');
        } else {
            element.classList.add('sub-left-disabled');
        }
    }
}
