import { BaseUIElement } from './base';
import { LabelElement } from './label';

export abstract class LabelledElement<Type> extends BaseUIElement<Type> {
    private _labelElement: LabelElement;

    public constructor(label: string) {
        super(label);
        this._label = label;
        this._labelElement = new LabelElement(label);
    }

    public generateHTML() {
        return `
            ${this._labelElement.generateHTML()}
            <div class="divider"></div>
            <div class="prop-right">
                ${this.generateInnerHTML()}
            </div>
        `;
    }

    protected abstract generateInnerHTML(): string;

    protected _onEnabledChanged() {
        this._labelElement.setEnabled(this._isEnabled);
    }

    public addDescription(text: string) {
        this._labelElement = new LabelElement(this._label, text);
    }
}
