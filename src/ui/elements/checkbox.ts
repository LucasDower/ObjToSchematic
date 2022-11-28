import { getRandomID } from '../../util';
import { ASSERT } from '../../util/error_util';
import { LabelledElement } from './labelled_element';

export class CheckboxElement extends LabelledElement<boolean> {
    private _checkboxId: string;
    private _checkboxPipId: string;
    private _checkboxTextId: string;
    private _onText: string;
    private _offText: string;

    public constructor(label: string, value: boolean, onText: string, offText: string) {
        super(label);
        this._checkboxId = getRandomID();
        this._checkboxPipId = getRandomID();
        this._checkboxTextId = getRandomID();
        this._value = value;
        this._onText = onText;
        this._offText = offText;
    }

    protected generateInnerHTML(): string {
        return `
            <div class="checkbox" id="${this._checkboxId}">
                <svg id="${this._checkboxPipId}" xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-check" width="44" height="44" viewBox="0 0 24 24" stroke-width="1.5" stroke="#2c3e50" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M5 12l5 5l10 -10" />
                </svg>
            </div>
            <div class="checkbox-text" id="${this._checkboxTextId}">${this.getValue() ? this._onText : this._offText}</div>
        `;
    }

    public registerEvents(): void {
        const checkboxElement = document.getElementById(this._checkboxId);
        const checkboxPipElement = document.getElementById(this._checkboxPipId);
        ASSERT(checkboxElement !== null && checkboxPipElement !== null);

        checkboxElement?.addEventListener('mouseenter', () => {
            if (this._isEnabled) {
                checkboxElement.classList.add('checkbox-hover');
                checkboxPipElement.classList.add('checkbox-pip-hover');
            }
        });

        checkboxElement?.addEventListener('mouseleave', () => {
            if (this._isEnabled) {
                checkboxElement.classList.remove('checkbox-hover');
                checkboxPipElement.classList.remove('checkbox-pip-hover');
            }
        });

        checkboxElement.addEventListener('click', () => {
            if (this._isEnabled) {
                this._value = !this._value;
                this._onValueChanged();
            }
        });
    }

    private _onValueChanged() {
        const checkboxElement = document.getElementById(this._checkboxId);
        const checkboxPipElement = document.getElementById(this._checkboxPipId);
        ASSERT(checkboxElement !== null && checkboxPipElement !== null);
        const checkboxTextElement = document.getElementById(this._checkboxTextId);
        ASSERT(checkboxTextElement !== null);

        checkboxTextElement.innerHTML = this.getValue() ? this._onText : this._offText;
        checkboxPipElement.style.visibility = this.getValue() ? 'visible' : 'hidden';

        if (this._isEnabled) {
            checkboxElement.classList.remove('checkbox-disabled');
        } else {
            checkboxElement.classList.add('checkbox-disabled');
        }

        this._onValueChangedDelegate?.(this._value!);
    }

    protected _onEnabledChanged(): void {
        super._onEnabledChanged();

        const checkboxElement = document.getElementById(this._checkboxId);
        const checkboxPipElement = document.getElementById(this._checkboxPipId);
        ASSERT(checkboxElement !== null && checkboxPipElement !== null);
        const checkboxTextElement = document.getElementById(this._checkboxTextId);
        ASSERT(checkboxTextElement !== null);

        checkboxTextElement.innerHTML = this.getValue() ? this._onText : this._offText;
        checkboxPipElement.style.visibility = this.getValue() ? 'visible' : 'hidden';

        if (this._isEnabled) {
            checkboxElement.classList.remove('checkbox-disabled');
            checkboxTextElement.classList.remove('checkbox-text-disabled');
            checkboxPipElement.classList.remove('checkbox-pip-disabled');
        } else {
            checkboxElement.classList.add('checkbox-disabled');
            checkboxTextElement.classList.add('checkbox-text-disabled');
            checkboxPipElement.classList.add('checkbox-pip-disabled');
        }

        this._onValueChangedDelegate?.(this._value!);
    }

    private _onValueChangedDelegate?: (value: boolean) => void;
    public onValueChanged(delegate: (value: boolean) => void) {
        this._onValueChangedDelegate = delegate;
        return this;
    }
}
