import { MaterialType } from '../../mesh';
import { AppIcons } from '../icons';
import { ConfigUIElement } from './config_element';
import { ToolbarItemElement } from './toolbar_item';

export class MaterialTypeElement extends ConfigUIElement<MaterialType, HTMLDivElement> {
    private _switchElement: ToolbarItemElement;

    public constructor(material: MaterialType) {
        super(material);
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
