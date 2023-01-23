import { UIUtil } from '../../util/ui_util';
import { ConfigUIElement } from './config_element';

export class CheckboxElement extends ConfigUIElement<boolean, HTMLSelectElement> {
    private _labelChecked: string;
    private _labelUnchecked: string;

    public constructor() {
        super(false);
        this._labelChecked = 'On';
        this._labelUnchecked = 'Off';
    }

    public setCheckedText(label: string) {
        this._labelChecked = label;
        return this;
    }

    public setUncheckedText(label: string) {
        this._labelUnchecked = label;
        return this;
    }

    public override registerEvents(): void {
        const checkboxElement = this._getElement();
        const checkboxPipElement = UIUtil.getElementById(this._getPipId());

        checkboxElement.addEventListener('mouseenter', () => {
            if (this.getEnabled()) {
                checkboxElement.classList.add('checkbox-hover');
                checkboxPipElement.classList.add('checkbox-pip-hover');
            }
        });

        checkboxElement.addEventListener('mouseleave', () => {
            if (this.getEnabled()) {
                checkboxElement.classList.remove('checkbox-hover');
                checkboxPipElement.classList.remove('checkbox-pip-hover');
            }
        });

        checkboxElement.addEventListener('click', () => {
            if (this.getEnabled()) {
                this._setValue(!this.getValue());
            }
        });
    }

    protected override _generateInnerHTML(): string {
        return `
            <div class="checkbox" id="${this._getId()}">
                <svg id="${this._getPipId()}" xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-check" width="44" height="44" viewBox="0 0 24 24" stroke-width="1.5" stroke="#2c3e50" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M5 12l5 5l10 -10" />
                </svg>
            </div>
            <div class="checkbox-text" id="${this._getLabelId()}">${this.getValue() ? this._labelChecked : this._labelUnchecked}</div>
        `;
    }

    protected override _onValueChanged(): void {
        const checkboxElement = this._getElement();
        const checkboxPipElement = UIUtil.getElementById(this._getPipId());
        const checkboxTextElement = UIUtil.getElementById(this._getLabelId());

        checkboxTextElement.innerHTML = this.getValue() ? this._labelChecked : this._labelUnchecked;
        checkboxPipElement.style.visibility = this.getValue() ? 'visible' : 'hidden';

        if (this.getEnabled()) {
            checkboxElement.classList.remove('checkbox-disabled');
        } else {
            checkboxElement.classList.add('checkbox-disabled');
        }
    }

    protected override _onEnabledChanged(): void {
        super._onEnabledChanged();

        const checkboxElement = this._getElement();
        const checkboxPipElement = UIUtil.getElementById(this._getPipId());
        const checkboxTextElement = UIUtil.getElementById(this._getLabelId());

        if (this.getEnabled()) {
            checkboxElement.classList.remove('checkbox-disabled');
            checkboxTextElement.classList.remove('checkbox-text-disabled');
            checkboxPipElement.classList.remove('checkbox-pip-disabled');
        } else {
            checkboxElement.classList.add('checkbox-disabled');
            checkboxTextElement.classList.add('checkbox-text-disabled');
            checkboxPipElement.classList.add('checkbox-pip-disabled');
        }
    }

    private _getPipId() {
        return this._getId() + '-pip';
    }

    private _getLabelId() {
        return this._getId() + '-label';
    }
}
