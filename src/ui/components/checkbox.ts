import { UIUtil } from '../../util/ui_util';
import { ConfigComponent } from './config';

export class CheckboxComponent extends ConfigComponent<boolean, HTMLSelectElement> {
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
        const CheckboxComponent = this._getElement();
        const textElement = UIUtil.getElementById(this._getTextId());

        CheckboxComponent.addEventListener('mouseenter', () => {
            this._onMouseEnterLeave(true);
        });

        CheckboxComponent.addEventListener('mouseleave', () => {
            this._onMouseEnterLeave(false);
        });

        textElement.addEventListener('mouseenter', () => {
            this._onMouseEnterLeave(true);
        });

        textElement.addEventListener('mouseleave', () => {
            this._onMouseEnterLeave(false);
        });

        CheckboxComponent.addEventListener('click', () => {
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
        this._setHovered(isHovering);
        this._updateStyles();
    }

    public override _generateInnerHTML(): string {
        return `
            <div class="struct-prop container-checkbox" id="${this._getId()}">
                <svg id="${this._getPipId()}" width="44" height="44" viewBox="0 0 24 24" stroke-width="1.5" stroke="#2c3e50" fill="none" stroke-linecap="round" stroke-linejoin="round">
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

    protected _updateStyles() {
        {
            const CheckboxComponent = UIUtil.getElementById(this._getId());
            UIUtil.updateStyles(CheckboxComponent, {
                isEnabled: this.enabled,
                isHovered: this.hovered,
                isActive: this.getValue(),
            });
        }
        const checkboxPipElement = UIUtil.getElementById(this._getPipId());
        const checkboxTextElement = UIUtil.getElementById(this._getTextId());

        checkboxTextElement.classList.remove('text-dark');
        checkboxTextElement.classList.remove('text-standard');
        checkboxTextElement.classList.remove('text-light');

        checkboxTextElement.innerHTML = this.getValue() ? this._labelChecked : this._labelUnchecked;
        checkboxPipElement.style.visibility = this.getValue() ? 'visible' : 'hidden';

        if (this.enabled) {
            if (this.hovered) {
                checkboxTextElement.classList.add('text-light');
            } else if (this.getValue()) {
                checkboxTextElement.classList.add('text-standard');
            }
        } else {
            checkboxTextElement.classList.add('text-dark');
        }
    }
}
