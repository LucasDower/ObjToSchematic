import { UIUtil } from '../../util/ui_util';
import { ConfigUIElement } from './config_element';

export class CheckboxElement extends ConfigUIElement<boolean, HTMLSelectElement> {
    private _labelChecked: string;
    private _labelUnchecked: string;
    private _hovering: boolean;

    public constructor() {
        super(false);
        this._labelChecked = 'On';
        this._labelUnchecked = 'Off';
        this._hovering = false;
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
        const textElement = UIUtil.getElementById(this._getTextId());

        checkboxElement.addEventListener('mouseenter', () => {
            this._onMouseEnterLeave(true);
        });

        checkboxElement.addEventListener('mouseleave', () => {
            this._onMouseEnterLeave(false);
        });

        textElement.addEventListener('mouseenter', () => {
            this._onMouseEnterLeave(true);
        });

        textElement.addEventListener('mouseleave', () => {
            this._onMouseEnterLeave(false);
        });

        checkboxElement.addEventListener('click', () => {
            this._onClick();
        });

        textElement.addEventListener('click', () => {
            this._onClick();
        });
    }

    private _onClick() {
        if (this.enabled) {
            this._setValue(!this.getValue());
        }
    }

    private _onMouseEnterLeave(isHovering: boolean) {
        this._hovering = isHovering;

        this._updateStyles();
    }

    public override _generateInnerHTML(): string {
        return `
            <div class="checkbox" id="${this._getId()}">
                <svg id="${this._getPipId()}" xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-check" width="44" height="44" viewBox="0 0 24 24" stroke-width="1.5" stroke="#2c3e50" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M5 12l5 5l10 -10" />
                </svg>
            </div>
            <div class="checkbox-text" id="${this._getTextId()}">${this.getValue() ? this._labelChecked : this._labelUnchecked}</div>
        `;
    }

    protected override _onValueChanged(): void {
        this._updateStyles();
    }

    public override finalise(): void {
        this._onValueChanged();
    }

    protected override _onEnabledChanged(): void {
        super._onEnabledChanged();

        this._updateStyles();
    }

    private _getPipId() {
        return this._getId() + '-pip';
    }

    private _getTextId() {
        return this._getId() + '-label';
    }

    public check() {
        this._setValue(true);
    }

    public uncheck() {
        this._setValue(false);
    }

    private _updateStyles() {
        const checkboxElement = UIUtil.getElementById(this._getId());
        const checkboxPipElement = UIUtil.getElementById(this._getPipId());
        const checkboxTextElement = UIUtil.getElementById(this._getTextId());

        checkboxElement.classList.remove('checkbox-disabled');
        checkboxElement.classList.remove('checkbox-hover');
        checkboxPipElement.classList.remove('checkbox-pip-disabled');
        checkboxPipElement.classList.remove('checkbox-pip-hover');
        checkboxTextElement.classList.remove('text-dark');
        checkboxTextElement.classList.remove('text-standard');
        checkboxTextElement.classList.remove('text-light');
        checkboxTextElement.classList.remove('checkbox-text-hover');

        checkboxTextElement.innerHTML = this.getValue() ? this._labelChecked : this._labelUnchecked;
        checkboxPipElement.style.visibility = this.getValue() ? 'visible' : 'hidden';

        if (this.enabled) {
            if (this._hovering) {
                checkboxElement.classList.add('checkbox-hover');
                checkboxPipElement.classList.add('checkbox-pip-hover');
                checkboxTextElement.classList.add('text-light');
                checkboxTextElement.classList.add('checkbox-text-hover');
            } else if (this.getValue()) {
                checkboxTextElement.classList.add('text-standard');
            }
        } else {
            checkboxElement.classList.add('checkbox-disabled');
            checkboxTextElement.classList.add('text-dark');
            checkboxPipElement.classList.add('checkbox-pip-disabled');
        }
    }
}
