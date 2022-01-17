import { assert } from '../../util';
import { ActionReturnType } from '../../app_context';

export class OutputElement {
    private _id: string;

    public constructor(id: string) {
        this._id = id;
    }

    public generateHTML() {
        return `
            <div class="item-body-sunken" id="${this._id}">
            </div>
        `;
    }

    public setMessage(message: string, returnType: ActionReturnType) {
        const element = document.getElementById(this._id) as HTMLDivElement;
        assert(element !== null);

        element.innerHTML = message;
        element.classList.remove('border-warning');
        element.classList.remove('border-error');
        if (returnType === ActionReturnType.Warning) {
            element.classList.add('border-warning');
        } else if (returnType === ActionReturnType.Failure) {
            element.classList.add('border-error');
        }
    }
}
