import { RGBAUtil } from '../../colour';
import { SolidMaterial } from '../../mesh';
import { getRandomID } from '../../util';
import { ConfigUIElement } from './config_element';

export class SolidMaterialElement extends ConfigUIElement<SolidMaterial, HTMLDivElement> {
    private _materialName: string;
    private _colourId: string;

    public constructor(materialName: string, material: SolidMaterial) {
        super(material);
        this._materialName = materialName;
        this._colourId = getRandomID();
    }

    public override registerEvents(): void {
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

        addSubproperty('Type', `Solid`);
        addSubproperty('Colour', `<input class="colour-swatch" type="color" id="${this._colourId}" value="${RGBAUtil.toHexString(material.colour)}">`);
        addSubproperty('Alpha', `${material.colour.a.toFixed(4)}`);

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
}
