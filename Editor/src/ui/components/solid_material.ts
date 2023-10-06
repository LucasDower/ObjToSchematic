import { OtS_Util, SolidMaterial } from '../../../../Core/src/materials';
import { ColourComponent } from './colour';
import { ConfigComponent } from './config';
import { SliderComponent } from './slider';

export class SolidMaterialComponent extends ConfigComponent<SolidMaterial, HTMLDivElement> {
    private _materialName: string;
    private _canBeTextured: boolean;

    private _colourComponent: ColourComponent;
    private _alphaElement: SliderComponent;

    public constructor(material: SolidMaterial) {
        super(OtS_Util.copySolidMaterial(material));

        this._materialName = material.name;
        this._canBeTextured = material.canBeTextured;

        this._colourComponent = new ColourComponent(material.colour)
            .setLabel('voxelise.components.colour');

        this._alphaElement = new SliderComponent()
            .setLabel('materials.components.alpha')
            .setMin(0.0)
            .setMax(1.0)
            .setDefaultValue(material.colour.a)
            .setDecimals(2)
            .setStep(0.01);

        this.setCanMinimise();
    }

    public override refresh() {
        super.refresh();

        this._colourComponent.refresh();
        this._alphaElement.refresh();
    }

    public override registerEvents(): void {
        this._colourComponent.registerEvents();
        this._alphaElement.registerEvents();

        this._colourComponent.addValueChangedListener((newColour) => {
            this.getValue().colour.r = newColour.r;
            this.getValue().colour.g = newColour.g;
            this.getValue().colour.b = newColour.b;
        });

        this._alphaElement.addValueChangedListener((newAlpha) => {
            this.getValue().colour.a = newAlpha;
        });
    }

    public override finalise(): void {
        //super.finalise();

        this._colourComponent.finalise();
        this._alphaElement.finalise();
    }

    public override _generateInnerHTML(): string {
        return `
            ${this._colourComponent.generateHTML()}
            ${this._alphaElement.generateHTML()}
        `;
    }

    protected override _onValueChanged(): void {
    }

    protected override _onEnabledChanged(): void {
        super._onEnabledChanged();

        this._colourComponent.setEnabled(this.enabled);
        this._alphaElement.setEnabled(this.enabled);
    }
}
