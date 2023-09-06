import { RGBA, RGBAUtil } from '../../../runtime/colour';
import { ConfigComponent } from './config';

export class ColourComponent extends ConfigComponent<RGBA, HTMLInputElement> {
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
            this._getElement().disabled = false;
        } else {
            this._getElement().disabled = true;
        }
    }
}
