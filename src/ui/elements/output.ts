import { ASSERT } from "../../util/error_util";
import { UIMessageBuilder } from '../misc';

export type OutputStyle = 'success' | 'warning' | 'error' | 'none';

export class OutputElement {
    private _id: string;

    public constructor() {
        this._id = '_' + Math.random().toString(16);
        this._message = new UIMessageBuilder();
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

    private _message: UIMessageBuilder;

    public setMessage(message: UIMessageBuilder, style?: OutputStyle) {
        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null);

        this._message = message;

        this.clearMessage();
        element.innerHTML = this._message.toString();
        switch (style) {
            case 'success':
                //element.classList.add('border-success');
                break;
            case 'warning':
                //element.classList.add('border-warning');
                break;
            case 'error':
                //element.classList.add('border-error');
                break;
        }
    }

    public getMessage() {
        return this._message;
    }

    /*
    public addMessage(message: UIMessageBuilder) {
        this._message.join(message);

        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null);

        element.innerHTML = this._message.toString();
        return this;
    }
    */

    public setStyle(style: OutputStyle) {
        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null);

        element.classList.remove('border-success');
        element.classList.remove('border-warning');
        element.classList.remove('border-error');

        switch (style) {
            case 'success':
                element.classList.add('border-success');
                break;
            case 'warning':
                element.classList.add('border-warning');
                break;
            case 'error':
                element.classList.add('border-error');
                break;
        }
    } 
}
