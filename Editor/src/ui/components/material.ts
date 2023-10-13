import { ConfigComponent } from "./config";
import { MaterialTypeComponent } from "./material_type";
import { SolidMaterialComponent } from './solid_material';
import { TexturedMaterialComponent } from "./textured_material";
import { UIUtil } from "../../util/ui_util";
import { RGBAColours, RGBAUtil } from "../../../../Core/src/colour";
import { OtS_Texture } from "../../../../Core/src/ots_texture";
import { OtS_MeshSectionMetadata } from "ots-core/src/ots_mesh";

export class MaterialComponent extends ConfigComponent<Promise<OtS_MeshSectionMetadata>, HTMLDivElement> {

    private _typeElement: MaterialTypeComponent;
    private _materialName: string;
    private _activeMaterialType: OtS_MeshSectionMetadata['type'] | 'disabled';
    private _subMaterialComponent?: SolidMaterialComponent | TexturedMaterialComponent;

    public constructor(original: OtS_MeshSectionMetadata, current?: OtS_MeshSectionMetadata) {
        //super(Promise.resolve(OtS_Util.copyMaterial(material)));
        super();

        this._materialName = original.name;
        this._activeMaterialType = current?.type ?? 'disabled';

        this._typeElement = new MaterialTypeComponent(original, current);

        /*
        switch (this._activeMaterialType) {
            case 'solid': 
                this._typeElement = new MaterialTypeComponent(original, current);
                //this._subMaterialComponent = new SolidMaterialComponent(material);
                //this._canBeTextured = material.canBeTextured;
        }

        if (this._activeMaterialType === 'solid') {
            this._typeElement = new MaterialTypeComponent(material.type, material.canBeTextured);
            this._subMaterialComponent = new SolidMaterialComponent(material);
            this._canBeTextured = material.canBeTextured;
        } else {
            this._typeElement = new MaterialTypeComponent(material.type, true);
            this._subMaterialComponent = new TexturedMaterialComponent(material);
            this._canBeTextured = true;
        }
        */

        this._typeElement
            .setLabel('materials.components.material_type')
            .addValueChangedListener((materialType) => {
                /*
                // TODO: Update
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
                */
            });

        this.setCanMinimise();
    }

    public override refresh() {
        super.refresh();

        this._typeElement.refresh();
        //this._subMaterialComponent.refresh();
    }

    public override registerEvents(): void {
        this._typeElement.registerEvents();
        //this._subMaterialComponent.registerEvents();
    }

    protected override _generateInnerHTML(): string {
        return `
            <div class="component-group" id="${this._getId()}-inner">
                ${this._typeElement.generateHTML()}
                ${/*this._subMaterialComponent._generateInnerHTML()*/ ""}
            </div>
        `;
    }

    public override finalise(): void {
        super.finalise();
        
        this._typeElement.finalise();
        //this._subMaterialComponent.finalise();
    }

    private _regenerate() {
        const innerElement = UIUtil.getElementById(this._getId() + '-inner');
        this._typeElement.setDefaultValue(this._activeMaterialType);

        innerElement.innerHTML = `
            ${this._typeElement.generateHTML()}
            ${/*this._subMaterialComponent._generateInnerHTML()*/ ""}
        `;

        this._typeElement.registerEvents();
        //this._subMaterialComponent.registerEvents();

        this._typeElement.finalise();
        //this._subMaterialComponent.finalise();
    }

    public override getValue(): Promise<OtS_MeshSectionMetadata> {
        return new Promise(async (res, rej) => {
            //const material = await this._subMaterialComponent.getValue();
            const material = this.getValue();
            res(material);
        });
    }
}