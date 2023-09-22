import { Material, OtS_MaterialType, SolidMaterial, TexturedMaterial, OtS_Util } from '../../../runtime/materials';
import { ConfigComponent } from "./config";
import { MaterialTypeComponent } from "./material_type";
import { SolidMaterialComponent } from './solid_material';
import { TexturedMaterialComponent } from "./textured_material";
import { UIUtil } from "../../../runtime/util/ui_util";
import { RGBAColours, RGBAUtil } from "../../../runtime/colour";
import { OtS_Texture } from "../../../runtime/ots_texture";

export class MaterialComponent extends ConfigComponent<Promise<Material>, HTMLDivElement> {

    private _typeElement: MaterialTypeComponent;
    private _materialName: string;
    private _activeMaterialType: OtS_MaterialType;
    private _canBeTextured: boolean;
    private _subMaterialComponent: SolidMaterialComponent | TexturedMaterialComponent;

    public constructor(material: Material) {
        //super(Promise.resolve(OtS_Util.copyMaterial(material)));
        super();

        this._materialName = material.name;
        this._activeMaterialType = material.type;

        if (material.type === 'solid') {
            this._typeElement = new MaterialTypeComponent(material.type, material.canBeTextured);
            this._subMaterialComponent = new SolidMaterialComponent(material);
            this._canBeTextured = material.canBeTextured;
        } else {
            this._typeElement = new MaterialTypeComponent(material.type, true);
            this._subMaterialComponent = new TexturedMaterialComponent(material);
            this._canBeTextured = true;
        }

        this._typeElement
            .setLabel('materials.components.material_type')
            .addValueChangedListener((materialType) => {
                if (materialType === 'solid') {
                    this._activeMaterialType = 'solid';
                    const newMaterial: SolidMaterial = {
                        type: 'solid',
                        name: this._materialName,
                        canBeTextured: this._canBeTextured,
                        colour: RGBAUtil.copy(RGBAColours.WHITE),
                    }
                    this._subMaterialComponent = new SolidMaterialComponent(newMaterial);
                    this._setValue(Promise.resolve(newMaterial));
                } else {
                    this._activeMaterialType = 'textured';
                    const newMaterial: TexturedMaterial = {
                        type: 'textured',
                        name: this._materialName,
                        texture: OtS_Texture.CreateDebugTexture(),
                    };
                    this._subMaterialComponent = new TexturedMaterialComponent(newMaterial);
                    this._setValue(Promise.resolve(newMaterial));
                }
                this._activeMaterialType = materialType;
                this._regenerate();
            });

        this.setCanMinimise();
    }

    public override refresh() {
        super.refresh();

        this._typeElement.refresh();
        this._subMaterialComponent.refresh();
    }

    public override registerEvents(): void {
        this._typeElement.registerEvents();
        this._subMaterialComponent.registerEvents();
    }

    protected override _generateInnerHTML(): string {
        return `
            <div class="component-group" id="${this._getId()}-inner">
                ${this._typeElement.generateHTML()}
                ${this._subMaterialComponent._generateInnerHTML()}
            </div>
        `;
    }

    public override finalise(): void {
        super.finalise();
        
        this._typeElement.finalise();
        this._subMaterialComponent.finalise();
    }

    private _regenerate() {
        const innerElement = UIUtil.getElementById(this._getId() + '-inner');
        this._typeElement.setDefaultValue(this._activeMaterialType);

        innerElement.innerHTML = `
            ${this._typeElement.generateHTML()}
            ${this._subMaterialComponent._generateInnerHTML()}
        `;

        this._typeElement.registerEvents();
        this._subMaterialComponent.registerEvents();

        this._typeElement.finalise();
        this._subMaterialComponent.finalise();
    }

    public override getValue(): Promise<Material> {
        return new Promise(async (res, rej) => {
            const material = await this._subMaterialComponent.getValue();
            res(material);
        });
    }
}