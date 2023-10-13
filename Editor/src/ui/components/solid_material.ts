import { OtS_MeshSectionMetadata } from 'ots-core/src/ots_mesh';
import { ColourComponent } from './colour';
import { ConfigComponent } from './config';
import { SliderComponent } from './slider';
import { ASSERT } from 'ots-core/src/util/error_util';
import { RGBAUtil } from 'ots-core/src/colour';

export class SolidMaterialComponent extends ConfigComponent<OtS_MeshSectionMetadata, HTMLDivElement> {
    private _colourComponent: ColourComponent;
    private _alphaElement: SliderComponent;

    public constructor(material: OtS_MeshSectionMetadata) {
        ASSERT(material.type === 'solid');

        super({
            type: material.type,
            name: material.name,
            colour: RGBAUtil.copy(material.colour),
        });

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
            const value = this.getValue();
            ASSERT(value.type === 'solid');
            value.colour.r = newColour.r;
            value.colour.g = newColour.g;
            value.colour.b = newColour.b;
        });

        this._alphaElement.addValueChangedListener((newAlpha) => {
            const value = this.getValue();
            ASSERT(value.type === 'solid');
            value.colour.a = newAlpha;
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
