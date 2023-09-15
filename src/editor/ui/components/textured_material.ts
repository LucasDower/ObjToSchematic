import { EImageChannel, TTransparencyTypes } from '../../../runtime/texture';
import { ASSERT } from '../../../runtime/util/error_util';
import { TTexelInterpolation } from '../../../runtime/util/type_util';
import { HTMLBuilder } from '../../../editor/ui/misc';
import { ComboboxComponent } from './combobox';
import { ConfigComponent } from './config';
import { ImageComponent } from './image';
import { MaterialTypeComponent } from './material_type';
import { SliderComponent } from './slider';
import { TexturedMaterial } from 'src/runtime/materials';

export class TexturedMaterialComponent extends ConfigComponent<TexturedMaterial, HTMLDivElement> {
    private _typeElement: MaterialTypeComponent;
    private _filteringElement: ComboboxComponent<'nearest' | 'linear'>;
    private _wrapElement: ComboboxComponent<'clamp' | 'repeat'>;
    private _transparencyElement: ComboboxComponent<TTransparencyTypes>;
    private _ImageComponent: ImageComponent;
    private _alphaValueElement?: SliderComponent;
    private _alphaMapElement?: ImageComponent;
    private _alphaChannelElement?: ComboboxComponent<EImageChannel>;

    public constructor(materialName: string, material: TexturedMaterial) {
        super(material);

        this._typeElement = new MaterialTypeComponent(material)
            .setLabel('materials.components.material_type');

        this._filteringElement = new ComboboxComponent<TTexelInterpolation>()
            .setLabel('materials.components.texture_filtering')
            .addItem({ payload: 'linear', displayLocKey: 'materials.components.linear' })
            .addItem({ payload: 'nearest', displayLocKey: 'materials.components.nearest' })
            .setDefaultValue(material.interpolation);

        this._wrapElement = new ComboboxComponent<'clamp' | 'repeat'>()
            .setLabel('materials.components.texture_wrap')
            .addItem({ payload: 'clamp', displayLocKey: 'materials.components.clamp' })
            .addItem({ payload: 'repeat', displayLocKey: 'materials.components.repeat' })
            .setDefaultValue(material.extension);

        this._transparencyElement = new ComboboxComponent<TTransparencyTypes>()
            .setLabel('materials.components.transparency')
            .addItem({ payload: 'None', displayLocKey: 'materials.components.none' })
            .addItem({ payload: 'UseAlphaMap', displayLocKey: 'materials.components.alpha_map' })
            .addItem({ payload: 'UseAlphaValue', displayLocKey: 'materials.components.alpha_constant' })
            .addItem({ payload: 'UseDiffuseMapAlphaChannel', displayLocKey: 'materials.components.diffuse_map_alpha_channel' })
            .setDefaultValue(material.transparency.type);

        this._ImageComponent = new ImageComponent(material.diffuse)
            .setLabel('materials.components.diffuse_map');

        switch (material.transparency.type) {
            case 'UseAlphaValue':
                this._alphaValueElement = new SliderComponent()
                    .setLabel('materials.components.alpha')
                    .setMin(0.0)
                    .setMax(1.0)
                    .setDefaultValue(material.transparency.alpha)
                    .setDecimals(2)
                    .setStep(0.01);
                break;
            case 'UseAlphaMap':
                this._alphaMapElement = new ImageComponent(material.transparency.alpha)
                    .setLabel('materials.components.alpha_map');

                this._alphaChannelElement = new ComboboxComponent<EImageChannel>()
                    .setLabel('materials.components.alpha_channel')
                    .addItem({ payload: EImageChannel.R, displayLocKey: 'misc.red' })
                    .addItem({ payload: EImageChannel.G, displayLocKey: 'misc.green' })
                    .addItem({ payload: EImageChannel.B, displayLocKey: 'misc.blue' })
                    .addItem({ payload: EImageChannel.A, displayLocKey: 'misc.alpha' })
                    .setDefaultValue(material.transparency.channel);
                break;
        }

        this.setCanMinimise();
    }

    public override refresh() {
        super.refresh();

        this._ImageComponent.refresh();
        this._typeElement.refresh();
        this._filteringElement.refresh();
        this._wrapElement.refresh();
        this._transparencyElement.refresh();
        this._alphaValueElement?.refresh();
        this._alphaMapElement?.refresh();
        this._alphaChannelElement?.refresh();
    }

    public override registerEvents(): void {
        this._ImageComponent.registerEvents();
        this._typeElement.registerEvents();
        this._filteringElement.registerEvents();
        this._wrapElement.registerEvents();
        this._transparencyElement.registerEvents();
        this._alphaValueElement?.registerEvents();
        this._alphaMapElement?.registerEvents();
        this._alphaChannelElement?.registerEvents();

        this._ImageComponent.addValueChangedListener((newPath) => {
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
            builder.add(this._ImageComponent.generateHTML());
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

        this._ImageComponent.setEnabled(this.enabled);
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

        this._ImageComponent.finalise();
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
