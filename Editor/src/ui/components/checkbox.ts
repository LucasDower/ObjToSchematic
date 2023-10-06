import { TTranslationMap } from '../../../loc/base';
import { DeepLeafKeys, LOC } from '../../localiser';
import { UIUtil } from '../../../../Core/src/util/ui_util';
import { ConfigComponent } from './config';

export class CheckboxComponent extends ConfigComponent<boolean, HTMLSelectElement> {
    private _checked: { type: 'localised', key: DeepLeafKeys<TTranslationMap> } | { type: 'unlocalised', text: string };
    private _unchecked: { type: 'localised', key: DeepLeafKeys<TTranslationMap> } | { type: 'unlocalised', text: string };

    public constructor() {
        super(false);
        this._checked = { type: 'localised', key: 'misc.on' };
        this._unchecked = { type: 'localised', key: 'misc.off' };
    }

    public setUnlocalisedCheckedText(text: string) {
        this._checked = {
            type: 'unlocalised', text: text,
        };
        return this;
    }

    public setUnlocalisedUncheckedText(text: string) {
        this._unchecked = {
            type: 'unlocalised', text: text,
        };
        return this;
    }

    public setCheckedText(key: DeepLeafKeys<TTranslationMap>) {
        this._checked = {
            type: 'localised', key: key,
        };
        return this;
    }

    public setUncheckedText(key: DeepLeafKeys<TTranslationMap>) {
        this._unchecked = {
            type: 'localised', key: key,
        };
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
        const displayText = this.getValue() ?
            (this._checked.type === 'localised' ? LOC(this._checked.key) : this._checked.text) :
            (this._unchecked.type === 'localised' ? LOC(this._unchecked.key) : this._unchecked.text);

        return `
            <div class="struct-prop container-checkbox" id="${this._getId()}">
                <svg id="${this._getPipId()}" width="44" height="44" viewBox="0 0 24 24" stroke-width="1.5" stroke="#2c3e50" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M5 12l5 5l10 -10" />
                </svg>
            </div>
            <div class="checkbox-text" id="${this._getTextId()}">${displayText}</div>
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

        const displayText = this.getValue() ?
            (this._checked.type === 'localised' ? LOC(this._checked.key) : this._checked.text) :
            (this._unchecked.type === 'localised' ? LOC(this._unchecked.key) : this._unchecked.text);

        checkboxTextElement.innerHTML = displayText;
        checkboxPipElement.style.visibility = this.getValue() ? 'visible' : 'hidden';

        if (this.enabled) {
            if (this.hovered) {
                checkboxTextElement.classList.add('text-light');
            } else {
                checkboxTextElement.classList.add('text-standard');
            }
        } else {
            checkboxTextElement.classList.add('text-dark');
        }
    }

    public override refresh(): void {
        super.refresh();

        const displayText = this.getValue() ?
            (this._checked.type === 'localised' ? LOC(this._checked.key) : this._checked.text) :
            (this._unchecked.type === 'localised' ? LOC(this._unchecked.key) : this._unchecked.text);

        const checkboxTextElement = UIUtil.getElementById(this._getTextId());
        checkboxTextElement.innerHTML = displayText;
    }
}
