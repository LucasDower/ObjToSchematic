import { MaterialType, SolidMaterial, TexturedMaterial } from '../../mesh';
import { AppIcons } from '../icons';
import { ConfigUIElement } from './config_element';
import { ToolbarItemElement } from './toolbar_item';

export class MaterialTypeElement extends ConfigUIElement<MaterialType, HTMLDivElement> {
    private _switchElement: ToolbarItemElement;
    private _material: SolidMaterial | TexturedMaterial;

    public constructor(material: SolidMaterial | TexturedMaterial) {
        super(material.type);
        this._material = material;
        this._switchElement = new ToolbarItemElement({ id: 'sw2', iconSVG: AppIcons.SWITCH })
            .setSmall()
            .setLabel('Switch')
            .onClick(() => {
                this._onClickChangeTypeDelegate?.();
            });
    }

    public override _generateInnerHTML() {
        const material = this.getValue();

        return `
            <div class="row-container">
                <div class="row-item">
                    ${material === MaterialType.solid ? 'Solid' : 'Textured'}
                </div>
                <div class="row-item">
                <div class="col-container">
                        <div class="col-item">
                            ${this._switchElement.generateHTML()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    public override finalise(): void {
        this._switchElement.setActive(this._material.type === MaterialType.solid && this._material.canBeTextured);
    }

    public override registerEvents(): void {
        this._switchElement.registerEvents();
    }

    protected override _onEnabledChanged(): void {
    }

    protected override _onValueChanged(): void {
    }

    private _onClickChangeTypeDelegate?: () => void;
    public onClickChangeTypeDelegate(delegate: () => void) {
        this._onClickChangeTypeDelegate = delegate;
        return this;
    }
}
