import { BaseUIElement } from './base';
import { ASSERT } from '../../util';

export class ButtonElement extends BaseUIElement<any> {
    private _onClick: () => void;

    public constructor(label: string, onClick: () => void) {
        super(label);
        this._onClick = onClick;
        this._isEnabled = true;
    }

    public generateHTML() {
        return `
            <div class="button" id="${this._id}">
                ${this._label}
            </div>
        `;
    }

    public registerEvents(): void {
        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null);

        element.addEventListener('click', () => {
            if (this._isEnabled) {
                this._onClick();
            }
        });
    }

    protected _onEnabledChanged() {
        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null);

        if (this._isEnabled) {
            element.classList.remove('button-disabled');
        } else {
            element.classList.add('button-disabled');
        }
    }
}
