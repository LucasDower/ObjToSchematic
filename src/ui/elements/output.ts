import { ASSERT } from '../../util/error_util';
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

    public registerEvents() {
        const toggler = document.getElementsByClassName('caret');

        for (let i = 0; i < toggler.length; i++) {
            const temp = toggler[i];
            temp.addEventListener('click', function () {
                temp.parentElement?.querySelector('.nested')?.classList.toggle('active');
                temp.classList.toggle('caret-down');
            });
        }

        this._message.postBuild();
    }

    private _message: UIMessageBuilder;

    public setMessage(message: UIMessageBuilder, style?: OutputStyle) {
        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null);

        this._message = message;

        element.innerHTML = this._message.toString();
    }

    public getMessage() {
        return this._message;
    }

    public setTaskInProgress(taskId: string, taskHeading: string) {
        this.getMessage()
            .clear(taskId)
            .addTask(taskId, taskHeading);

        this.updateMessage();
    }

    public setTaskComplete(taskId: string, taskHeading: string, taskItems: string[], style: OutputStyle) {
        const builder = this.getMessage().clear(taskId);

        if (taskItems.length > 0) {
            builder.addHeading(taskId, taskHeading, style);
        } else {
            builder.addBold(taskId, [taskHeading], style);
        }

        builder.addItem(taskId, taskItems, style);

        this.updateMessage();
    }

    public updateMessage() {
        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null);

        element.innerHTML = this._message.toString();
        this.registerEvents();
    }

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
