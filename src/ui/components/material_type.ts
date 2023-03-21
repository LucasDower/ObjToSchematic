import { MaterialType, SolidMaterial, TexturedMaterial } from '../../mesh';
import { AppIcons } from '../icons';
import { ConfigComponent } from './config';
import { ToolbarItemComponent } from './toolbar_item';

export class MaterialTypeComponent extends ConfigComponent<MaterialType, HTMLDivElement> {
    private _solidButton: ToolbarItemComponent;
    private _texturedButton: ToolbarItemComponent;
    private _material: SolidMaterial | TexturedMaterial;

    public constructor(material: SolidMaterial | TexturedMaterial) {
        super(material.type);
        this._material = material;

        this._solidButton = new ToolbarItemComponent({ id: 'sw1', iconSVG: AppIcons.COLOUR_SWATCH })
            .setLabel('Solid')
            .onClick(() => {
                if (this._material.type === MaterialType.textured) {
                    this._onClickChangeTypeDelegate?.();
                }
            });

        this._texturedButton = new ToolbarItemComponent({ id: 'sw2', iconSVG: AppIcons.IMAGE })
            .setLabel('Textured')
            .onClick(() => {
                if (this._material.type === MaterialType.solid) {
                    this._onClickChangeTypeDelegate?.();
                }
            });
    }

    public override _generateInnerHTML() {
        return `
            <div class="toolbar-group" style="width: 100%;">
                ${this._solidButton.generateHTML()}
                ${this._texturedButton.generateHTML()}
            </div>
        `;
    }

    public override finalise(): void {
        this._solidButton.finalise();
        this._texturedButton.finalise();

        this._solidButton.setActive(this._material.type === MaterialType.solid);
        this._texturedButton.setActive(this._material.type === MaterialType.textured);
    }

    public override registerEvents(): void {
        this._solidButton.registerEvents();
        this._texturedButton.registerEvents();
    }

    protected override _onEnabledChanged(): void {
        super._onEnabledChanged();

        this._solidButton.setEnabled(this.enabled);
        this._texturedButton.setEnabled(this.enabled);
    }

    protected override _onValueChanged(): void {
    }

    private _onClickChangeTypeDelegate?: () => void;
    public onClickChangeTypeDelegate(delegate: () => void) {
        this._onClickChangeTypeDelegate = delegate;
        return this;
    }
}
