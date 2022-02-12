import { ASSERT } from '../../util';
import { ActionReturnType } from '../../app_context';

export class OutputElement {
    private _id: string;

    public constructor() {
        this._id = '_' + Math.random().toString(16);
    }

    public generateHTML() {
        return `
            <div class="item-body-sunken" id="${this._id}">
            </div>
        `;
    }

    public clearMessage() {
        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null);
        
        element.innerHTML = '';
        element.classList.remove('border-success');
        element.classList.remove('border-warning');
        element.classList.remove('border-error');
    }

    public setMessage(message: string, returnType: ActionReturnType) {
        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null);

        this.clearMessage();
        element.innerHTML = message;
        if (returnType === ActionReturnType.Success) {
            element.classList.add('border-success');
        } else if (returnType === ActionReturnType.Warning) {
            element.classList.add('border-warning');
        } else if (returnType === ActionReturnType.Failure) {
            element.classList.add('border-error');
        }
    }
}
