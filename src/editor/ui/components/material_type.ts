import { LOC } from '../../localiser';
import { AppIcons } from '../../../editor/ui/icons';
import { ConfigComponent } from './config';
import { ToolbarItemComponent } from './toolbar_item';
import { Material, OtS_MaterialType } from '../../../runtime/materials';

export class MaterialTypeComponent extends ConfigComponent<OtS_MaterialType, HTMLDivElement> {
    private _solidButton: ToolbarItemComponent;
    private _texturedButton: ToolbarItemComponent;
    private _material: Material;

    public constructor(material: Material) {
        super(material.type);
        this._material = material;

        this._solidButton = new ToolbarItemComponent({ id: 'sw1', iconSVG: AppIcons.COLOUR_SWATCH })
            .setLabel(LOC('materials.components.solid'))
            .setGrow()
            .onClick(() => {
                if (this._material.type === 'textured') {
                    this._onClickChangeTypeDelegate?.();
                }
            });

        this._texturedButton = new ToolbarItemComponent({ id: 'sw2', iconSVG: AppIcons.IMAGE })
            .setLabel(LOC('materials.components.textured'))
            .setGrow()
            .onClick(() => {
                if (this._material.type === 'solid') {
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

        this._solidButton.setActive(this._material.type === 'solid');
        this._texturedButton.setActive(this._material.type === 'textured');
    }

    public override registerEvents(): void {
        this._solidButton.registerEvents();
        this._texturedButton.registerEvents();
    }

    protected override _onEnabledChanged(): void {
        super._onEnabledChanged();

        this._solidButton.setEnabled(this.enabled);
        this._texturedButton.setEnabled(this.enabled && (this._material.type === 'textured' || this._material.canBeTextured));
    }

    protected override _onValueChanged(): void {
    }

    private _onClickChangeTypeDelegate?: () => void;
    public onClickChangeTypeDelegate(delegate: () => void) {
        this._onClickChangeTypeDelegate = delegate;
        return this;
    }
}
