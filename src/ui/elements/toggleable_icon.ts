import { ToggleableElement } from '../toggleable';

export class ToggleableIcon extends ToggleableElement<string> {
    private _iconPath: string;
    private _iconSize: number;

    public constructor(iconPath: string, iconSize: number, initiallyActive: boolean, value: string) {
        super(initiallyActive);

        this._iconPath = iconPath;
        this._iconSize = iconSize;

        this._value = value;
    }

    protected _generateChildHTML(): string {
        return `
            <img class="toggleable-icon" src="${this._iconPath}" draggable="false" width="${this._iconSize}" height="${this._iconSize}">
        `;
    }
}
