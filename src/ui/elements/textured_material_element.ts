import path from 'path';

import { MaterialType, TexturedMaterial } from '../../mesh';
import { EImageChannel, TTransparencyTypes } from '../../texture';
import { getRandomID } from '../../util';
import { ASSERT } from '../../util/error_util';
import { TTexelInterpolation } from '../../util/type_util';
import { HTMLBuilder } from '../misc';
import { ComboBoxElement } from './combobox';
import { ConfigUIElement } from './config_element';
import { ImageElement } from './image_element';
import { MaterialTypeElement } from './material_type_element';
import { SliderElement } from './slider';

export class TexturedMaterialElement extends ConfigUIElement<TexturedMaterial, HTMLDivElement> {
    private _typeElement: MaterialTypeElement;
    private _filteringElement: ComboBoxElement<'nearest' | 'linear'>;
    private _wrapElement: ComboBoxElement<'clamp' | 'repeat'>;
    private _transparencyElement: ComboBoxElement<TTransparencyTypes>;
    private _imageElement: ImageElement;
    private _alphaValueElement?: SliderElement;
    private _alphaMapElement?: ImageElement;
    private _alphaChannelElement?: ComboBoxElement<EImageChannel>;

    public constructor(materialName: string, material: TexturedMaterial) {
        super(material);

        this._typeElement = new MaterialTypeElement(material)
            .setLabel('Type');

        this._filteringElement = new ComboBoxElement<TTexelInterpolation>()
            .setLabel('Filtering')
            .addItem({ payload: 'linear', displayText: 'Linear' })
            .addItem({ payload: 'nearest', displayText: 'Nearest' })
            .setDefaultValue(material.interpolation);

        this._wrapElement = new ComboBoxElement<'clamp' | 'repeat'>()
            .setLabel('Wrap')
            .addItem({ payload: 'clamp', displayText: 'Clamp' })
            .addItem({ payload: 'repeat', displayText: 'Repeat' })
            .setDefaultValue(material.extension);

        this._transparencyElement = new ComboBoxElement<TTransparencyTypes>()
            .setLabel('Transparency')
            .addItem({ payload: 'None', displayText: 'None' })
            .addItem({ payload: 'UseAlphaMap', displayText: 'Alpha map' })
            .addItem({ payload: 'UseAlphaValue', displayText: 'Alpha constant' })
            .addItem({ payload: 'UseDiffuseMapAlphaChannel', displayText: 'Diffuse map alpha channel' })
            .setDefaultValue(material.transparency.type);

        this._imageElement = new ImageElement(material.diffuse)
            .setLabel('Diffuse map');

        switch (material.transparency.type) {
            case 'UseAlphaValue':
                this._alphaValueElement = new SliderElement()
                    .setLabel('Alpha')
                    .setMin(0.0)
                    .setMax(1.0)
                    .setDefaultValue(material.transparency.alpha)
                    .setDecimals(2)
                    .setStep(0.01);
                break;
            case 'UseAlphaMap':
                this._alphaMapElement = new ImageElement(material.transparency.alpha)
                    .setLabel('Alpha map');

                this._alphaChannelElement = new ComboBoxElement<EImageChannel>()
                    .setLabel('Alpha channel')
                    .addItem({ payload: EImageChannel.R, displayText: 'Red' })
                    .addItem({ payload: EImageChannel.G, displayText: 'Green' })
                    .addItem({ payload: EImageChannel.B, displayText: 'Blue' })
                    .addItem({ payload: EImageChannel.A, displayText: 'Alpha' })
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
        const builder = new HTMLBuilder();

        builder.add('<div class="component-group">');
        {
            builder.add(this._typeElement.generateHTML());
            builder.add(this._imageElement.generateHTML());
            builder.add(this._filteringElement.generateHTML());
            builder.add(this._wrapElement.generateHTML());
            builder.add(this._transparencyElement.generateHTML());
            if (this._alphaMapElement !== undefined) {
                ASSERT(this._alphaChannelElement !== undefined);
                builder.add(this._alphaMapElement.generateHTML());
                builder.add(this._alphaChannelElement.generateHTML());
            }
            if (this._alphaValueElement !== undefined) {
                builder.add(this._alphaValueElement.generateHTML());
            }
        }
        builder.add('</div>');

        return builder.toString();
    }

    protected override _onValueChanged(): void {
    }

    protected override _onEnabledChanged(): void {
        super._onEnabledChanged();

        this._imageElement.setEnabled(this.enabled);
        this._typeElement.setEnabled(this.enabled);
        this._filteringElement.setEnabled(this.enabled);
        this._wrapElement.setEnabled(this.enabled);
        this._transparencyElement.setEnabled(this.enabled);
        this._alphaValueElement?.setEnabled(this.enabled);
        this._alphaMapElement?.setEnabled(this.enabled);
        this._alphaChannelElement?.setEnabled(this.enabled);
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
