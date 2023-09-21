import { SolidMaterial } from 'src/runtime/materials';
import { ColourComponent } from './colour';
import { ConfigComponent } from './config';
import { MaterialTypeComponent } from './material_type';
import { SliderComponent } from './slider';

export class SolidMaterialComponent extends ConfigComponent<SolidMaterial, HTMLDivElement> {
    private _materialName: string;
    private _canBeTextured: boolean;

    private _typeElement: MaterialTypeComponent;
    private _colourComponent: ColourComponent;
    private _alphaElement: SliderComponent;

    public constructor(material: SolidMaterial) {
        super();

        this._materialName = material.name;
        this._canBeTextured = material.canBeTextured;

        this._typeElement = new MaterialTypeComponent(material)
            .setLabel('materials.components.material_type');

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

        this._typeElement.refresh();
        this._colourComponent.refresh();
        this._alphaElement.refresh();
    }

    public override registerEvents(): void {
        this._typeElement.registerEvents();
        this._colourComponent.registerEvents();
        this._alphaElement.registerEvents();

        this._typeElement.onClickChangeTypeDelegate(() => {
            this._onChangeTypeDelegate?.();
        });

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
        super.finalise();

        this._typeElement.finalise();
        this._colourComponent.finalise();
        this._alphaElement.finalise();
    }

    protected override _generateInnerHTML(): string {
        return `
            <div class="component-group">
                ${this._typeElement.generateHTML()}
                ${this._colourComponent.generateHTML()}
                ${this._alphaElement.generateHTML()}
            </div>
        `;
    }

    protected override _onValueChanged(): void {
    }

    protected override _onEnabledChanged(): void {
        super._onEnabledChanged();

        this._typeElement.setEnabled(this.enabled);
        this._colourComponent.setEnabled(this.enabled);
        this._alphaElement.setEnabled(this.enabled);
    }

    private _onChangeTypeDelegate?: () => void;
    public onChangeTypeDelegate(delegate: () => void) {
        this._onChangeTypeDelegate = delegate;
        return this;
    }

    public override getValue(): SolidMaterial {
        return {
            type: 'solid',
            name: this._materialName,
            colour: this._colourComponent.getValue(),
            canBeTextured: this._canBeTextured,
        };
    }
}
