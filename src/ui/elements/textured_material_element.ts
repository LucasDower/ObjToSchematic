import path from 'path';

import { MaterialType, TexturedMaterial } from '../../mesh';
import { EImageChannel, TTransparencyTypes } from '../../texture';
import { getRandomID } from '../../util';
import { ASSERT } from '../../util/error_util';
import { ComboBoxElement } from './combobox';
import { ConfigUIElement } from './config_element';
import { ImageElement } from './image_element';
import { MaterialTypeElement } from './material_type_element';
import { SliderElement } from './slider';

export class TexturedMaterialElement extends ConfigUIElement<TexturedMaterial, HTMLDivElement> {
    private _materialName: string;
    private _colourId: string;
    private _filteringElement: ComboBoxElement<'nearest' | 'linear'>;
    private _wrapElement: ComboBoxElement<'clamp' | 'repeat'>;
    private _transparencyElement: ComboBoxElement<TTransparencyTypes>;
    private _imageElement: ImageElement;
    private _typeElement: MaterialTypeElement;
    private _alphaValueElement?: SliderElement;
    private _alphaMapElement?: ImageElement;
    private _alphaChannelElement?: ComboBoxElement<EImageChannel>;

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

        this._transparencyElement = new ComboBoxElement<TTransparencyTypes>()
            .addItem({ payload: 'None', displayText: 'None' })
            .addItem({ payload: 'UseAlphaMap', displayText: 'Alpha map' })
            .addItem({ payload: 'UseAlphaValue', displayText: 'Alpha constant' })
            .addItem({ payload: 'UseDiffuseMapAlphaChannel', displayText: 'Diffuse map alpha channel' })
            .setSmall()
            .setDefaultValue(material.transparency.type);

        this._imageElement = new ImageElement(material.diffuse);

        this._typeElement = new MaterialTypeElement(MaterialType.textured);

        switch (material.transparency.type) {
            case 'UseAlphaValue':
                this._alphaValueElement = new SliderElement()
                    .setMin(0.0)
                    .setMax(1.0)
                    .setDefaultValue(material.transparency.alpha)
                    .setDecimals(2)
                    .setStep(0.01)
                    .setSmall();
                break;
            case 'UseAlphaMap':
                this._alphaMapElement = new ImageElement(material.transparency.alpha);
                this._alphaChannelElement = new ComboBoxElement<EImageChannel>()
                    .addItem({ payload: EImageChannel.R, displayText: 'Red' })
                    .addItem({ payload: EImageChannel.G, displayText: 'Green' })
                    .addItem({ payload: EImageChannel.B, displayText: 'Blue' })
                    .addItem({ payload: EImageChannel.A, displayText: 'Alpha' })
                    .setSmall()
                    .setDefaultValue(material.transparency.channel);
                break;
        }
    }

    public override registerEvents(): void {
        this._imageElement.registerEvents();
        this._typeElement.registerEvents();
        this._filteringElement.registerEvents();
        this._wrapElement.registerEvents();
        this._transparencyElement.registerEvents();
        this._alphaValueElement?.registerEvents();
        this._alphaMapElement?.registerEvents();
        this._alphaChannelElement?.registerEvents();

        this._imageElement.addValueChangedListener((newPath) => {
            const material = this.getValue();
            // TODO Unimplemented, promise should be resolved where it is used
            newPath.then((res) => {
                material.diffuse = {
                    filetype: res.filetype, // TODO Unimplemented other filetypes
                    raw: res.raw,
                };
            });
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

        this._alphaValueElement?.addValueChangedListener((newAlpha) => {
            const material = this.getValue();
            ASSERT(material.transparency.type === 'UseAlphaValue');
            material.transparency.alpha = newAlpha;
        });

        this._alphaMapElement?.addValueChangedListener((newPath) => {
            const material = this.getValue();
            // TODO Unimplemented, promise should be resolved where it is used
            newPath.then((res) => {
                ASSERT(material.transparency.type === 'UseAlphaMap');
                material.transparency.alpha = {
                    filetype: res.filetype, // TODO Unimplemented other filetypes
                    raw: res.raw,
                };
            });
        });

        this._alphaChannelElement?.addValueChangedListener((newChannel) => {
            const material = this.getValue();
            ASSERT(material.transparency.type === 'UseAlphaMap');
            material.transparency.channel = newChannel;
        });

        this._transparencyElement.addValueChangedListener((newTransparency) => {
            this._onChangeTransparencyTypeDelegate?.(newTransparency);
        });
    }

    protected override _generateInnerHTML(): string {
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
        addSubproperty('Diffuse map', this._imageElement._generateInnerHTML());
        addSubproperty('Filtering', this._filteringElement._generateInnerHTML());
        addSubproperty('Wrap', this._wrapElement._generateInnerHTML());
        addSubproperty('Transparency', this._transparencyElement._generateInnerHTML());
        if (this._alphaMapElement !== undefined) {
            ASSERT(this._alphaChannelElement !== undefined);
            addSubproperty('Alpha map', this._alphaMapElement._generateInnerHTML());
            addSubproperty('Channel', this._alphaChannelElement._generateInnerHTML());
        }
        if (this._alphaValueElement) {
            addSubproperty('Alpha', this._alphaValueElement._generateInnerHTML());
        }

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
        this._transparencyElement.finalise();
        this._alphaValueElement?.finalise();
        this._alphaMapElement?.finalise();
        this._alphaChannelElement?.finalise();
    }

    private _onChangeTypeDelegate?: () => void;
    public onChangeTypeDelegate(delegate: () => void) {
        this._onChangeTypeDelegate = delegate;
        return this;
    }

    private _onChangeTransparencyTypeDelegate?: (newTransparency: TTransparencyTypes) => void;
    public onChangeTransparencyTypeDelegate(delegate: (newTransparency: TTransparencyTypes) => void) {
        this._onChangeTransparencyTypeDelegate = delegate;
        return this;
    }
}
