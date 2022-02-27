import { BaseUIElement } from './base';
import { LabelElement } from './label';

export abstract class LabelledElement extends BaseUIElement {
    private _labelElement: LabelElement;

    public constructor(label: string) {
        super(label);
        this._labelElement = new LabelElement(label, label);
    }

    public generateHTML() {
        return `
            ${this._labelElement.generateHTML()}
            <div class="divider"></div>
            <div class="sub-right">
                ${this.generateInnerHTML()}
            </div>
        `;
    }

    protected abstract generateInnerHTML(): string;

    protected _onEnabledChanged() {
        this._labelElement.setEnabled(this._isEnabled);
    }
}
