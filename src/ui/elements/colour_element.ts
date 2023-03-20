import { RGBA, RGBAUtil } from '../../colour';
import { ConfigUIElement } from './config_element';

export class ColourElement extends ConfigUIElement<RGBA, HTMLInputElement> {
    public constructor(colour: RGBA) {
        super(colour);
    }

    protected override _generateInnerHTML(): string {
        return `<input class="colour-swatch" type="color" id="${this._getId()}" value="${RGBAUtil.toHexString(this.getValue())}">`;
    }

    public override registerEvents(): void {
        this._getElement().addEventListener('change', () => {
            const newColour = RGBAUtil.fromHexString(this._getElement().value);
            this._setValue(newColour);
        });
    }

    protected _onEnabledChanged(): void {
        super._onEnabledChanged();

        if (this.enabled) {
            this._getElement().classList.add('enabled');
        } else {
            this._getElement().classList.remove('enabled');
        }
    }
}
