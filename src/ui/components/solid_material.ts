import { SolidMaterial } from '../../mesh';
import { ColourComponent } from './colour';
import { ConfigComponent } from './config';
import { MaterialTypeComponent } from './material_type';
import { SliderComponent } from './slider';

export class SolidMaterialComponent extends ConfigComponent<SolidMaterial, HTMLDivElement> {
    private _typeElement: MaterialTypeComponent;
    private _ColourComponent: ColourComponent;
    private _alphaElement: SliderComponent;

    public constructor(materialName: string, material: SolidMaterial) {
        super(material);

        this._typeElement = new MaterialTypeComponent(material)
            .setLabel('Type');

        this._ColourComponent = new ColourComponent(material.colour)
            .setLabel('Colour');

        this._alphaElement = new SliderComponent()
            .setLabel('Alpha')
            .setMin(0.0)
            .setMax(1.0)
            .setDefaultValue(material.colour.a)
            .setDecimals(2)
            .setStep(0.01);
    }

    public override registerEvents(): void {
        this._typeElement.registerEvents();
        this._ColourComponent.registerEvents();
        this._alphaElement.registerEvents();

        this._typeElement.onClickChangeTypeDelegate(() => {
            this._onChangeTypeDelegate?.();
        });

        this._ColourComponent.addValueChangedListener((newColour) => {
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
        this._ColourComponent.finalise();
        this._alphaElement.finalise();
    }

    protected override _generateInnerHTML(): string {
        return `
            <div class="component-group">
                ${this._typeElement.generateHTML()}
                ${this._ColourComponent.generateHTML()}
                ${this._alphaElement.generateHTML()}
            </div>
        `;
    }

    protected override _onValueChanged(): void {
    }

    protected override _onEnabledChanged(): void {
        super._onEnabledChanged();

        this._typeElement.setEnabled(this.enabled);
        this._ColourComponent.setEnabled(this.enabled);
        this._alphaElement.setEnabled(this.enabled);
    }

    private _onChangeTypeDelegate?: () => void;
    public onChangeTypeDelegate(delegate: () => void) {
        this._onChangeTypeDelegate = delegate;
        return this;
    }
}
