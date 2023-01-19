import { MaterialType, TexturedMaterial } from '../../mesh';
import { getRandomID } from '../../util';
import { ComboBoxElement } from './combobox';
import { ConfigUIElement } from './config_element';
import { ImageElement } from './image_element';
import { MaterialTypeElement } from './material_type_element';

export class TexturedMaterialElement extends ConfigUIElement<TexturedMaterial, HTMLDivElement> {
    private _materialName: string;
    private _colourId: string;
    private _filteringElement: ComboBoxElement<'nearest' | 'linear'>;
    private _wrapElement: ComboBoxElement<'clamp' | 'repeat'>;
    private _imageElement: ImageElement;
    private _typeElement: MaterialTypeElement;

    public constructor(materialName: string, material: TexturedMaterial) {
        super(material);
        this._materialName = materialName;
        this._colourId = getRandomID();

        this._filteringElement = new ComboBoxElement<'linear' | 'nearest'>()
            .addItem({ payload: 'linear', displayText: 'Linear' })
            .addItem({ payload: 'nearest', displayText: 'Nearest' })
            .setSmall()
            .setDefaultValue(material.interpolation);

        this._wrapElement = new ComboBoxElement<'clamp' | 'repeat'>()
            .addItem({ payload: 'clamp', displayText: 'Clamp' })
            .addItem({ payload: 'repeat', displayText: 'Repeat' })
            .setSmall()
            .setDefaultValue(material.extension);

        this._imageElement = new ImageElement(material.path);

        this._typeElement = new MaterialTypeElement(MaterialType.textured);
    }

    public override registerEvents(): void {
        this._imageElement.registerEvents();
        this._typeElement.registerEvents();
        this._filteringElement.registerEvents();
        this._wrapElement.registerEvents();

        this._imageElement.addValueChangedListener((newPath) => {
            const material = this.getValue();
            material.path = newPath;
        });

        this._filteringElement.addValueChangedListener((newFiltering) => {
            const material = this.getValue();
            material.interpolation = newFiltering;
        });

        this._wrapElement.addValueChangedListener((newWrap) => {
            const material = this.getValue();
            material.extension = newWrap;
        });

        this._typeElement.onClickChangeTypeDelegate(() => {
            this._onChangeTypeDelegate?.();
        });
    }

    protected override _generateInnerHTML(): string {
        const material = this.getValue();

        const subproperties: string[] = [];
        const addSubproperty = (key: string, value: string) => {
            subproperties.push(`
                <div class="subproperty">
                    <div class="subprop-key-container">
                        ${key}
                    </div>
                    <div class="subprop-value-container">
                        ${value}
                    </div>
                </div>
            `);
        };

        addSubproperty('Type', this._typeElement._generateInnerHTML());
        addSubproperty('Alpha', material.alphaFactor.toFixed(4));
        addSubproperty('File', this._imageElement._generateInnerHTML());
        addSubproperty('Filtering', this._filteringElement._generateInnerHTML());
        addSubproperty('Wrap', this._wrapElement._generateInnerHTML());

        return `
            <div class="subproperty-container">
                ${subproperties.join('')}
            </div>
        `;
    }

    protected override _onValueChanged(): void {
    }

    protected override _onEnabledChanged(): void {
        super._onEnabledChanged();
    }

    public override finalise(): void {
        super.finalise();

        this._imageElement.finalise();
        this._typeElement.finalise();
        this._filteringElement.finalise();
        this._wrapElement.finalise();
    }

    private _onChangeTypeDelegate?: () => void;
    public onChangeTypeDelegate(delegate: () => void) {
        this._onChangeTypeDelegate = delegate;
        return this;
    }
}
