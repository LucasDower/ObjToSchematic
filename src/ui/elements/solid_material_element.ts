import { SolidMaterial } from '../../mesh';
import { ColourElement } from './colour_element';
import { ConfigUIElement } from './config_element';
import { MaterialTypeElement } from './material_type_element';
import { SliderElement } from './slider';

export class SolidMaterialElement extends ConfigUIElement<SolidMaterial, HTMLDivElement> {
    private _typeElement: MaterialTypeElement;
    private _colourElement: ColourElement;
    private _alphaElement: SliderElement;

    public constructor(materialName: string, material: SolidMaterial) {
        super(material);

        this._typeElement = new MaterialTypeElement(material)
            .setLabel('Type');

        this._colourElement = new ColourElement(material.colour)
            .setLabel('Colour');

        this._alphaElement = new SliderElement()
            .setLabel('Alpha')
            .setMin(0.0)
            .setMax(1.0)
            .setDefaultValue(material.colour.a)
            .setDecimals(2)
            .setStep(0.01);
    }

    public override registerEvents(): void {
        this._typeElement.registerEvents();
        this._colourElement.registerEvents();
        this._alphaElement.registerEvents();

        this._typeElement.onClickChangeTypeDelegate(() => {
            this._onChangeTypeDelegate?.();
        });

        this._colourElement.addValueChangedListener((newColour) => {
            this.getValue().colour.r = newColour.r;
            this.getValue().colour.g = newColour.g;
            this.getValue().colour.b = newColour.b;
        });

        this._alphaElement.addValueChangedListener((newAlpha) => {
            this.getValue().colour.a = newAlpha;
        });
    }

    public override finalise(): void {
        this._typeElement.finalise();
        this._colourElement.finalise();
        this._alphaElement.finalise();
    }

    protected override _generateInnerHTML(): string {
        return `
            <div class="component-group">
                ${this._typeElement.generateHTML()}
                ${this._colourElement.generateHTML()}
                ${this._alphaElement.generateHTML()}
            </div>
        `;
    }

    protected override _onValueChanged(): void {
    }

    protected override _onEnabledChanged(): void {
        super._onEnabledChanged();

        this._typeElement.setEnabled(this.enabled);
        this._colourElement.setEnabled(this.enabled);
        this._alphaElement.setEnabled(this.enabled);
    }

    private _onChangeTypeDelegate?: () => void;
    public onChangeTypeDelegate(delegate: () => void) {
        this._onChangeTypeDelegate = delegate;
        return this;
    }
}
