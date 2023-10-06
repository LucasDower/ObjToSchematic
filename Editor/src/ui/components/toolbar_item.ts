import { ASSERT } from '../../../../Core/src/util/error_util';
import { UIUtil } from '../../util/ui_util';
import { BaseComponent } from './base';
import { LOC, TLocalisedKey } from '../../localiser';

export type TToolbarBooleanProperty = 'enabled' | 'active';

export type TToolbarItemParams = {
    id: string,
    iconSVG: string;
}

export class ToolbarItemComponent extends BaseComponent<HTMLDivElement>  {
    private _iconSVG: SVGSVGElement;
    private _label: string;
    private _onClick?: () => void;
    private _isActive: boolean;
    private _grow: boolean;
    private _tooltipLocKey: TLocalisedKey | null;

    public constructor(params: TToolbarItemParams) {
        super();

        this._isActive = false;
        this._grow = false;

        {
            const parser = new DOMParser();
            const svgParse = parser.parseFromString(params.iconSVG, 'text/html');
            const svgs = svgParse.getElementsByTagName('svg');
            ASSERT(svgs.length === 1, 'Missing SVG');

            this._iconSVG = svgs[0];
            this._iconSVG.id = this._getId() + '-svg';
        }

        this._label = '';
        this._tooltipLocKey = null;
    }

    public setGrow() {
        this._grow = true;
        return this;
    }

    public updateTranslation() {
        if (this._tooltipLocKey) {
            UIUtil.getElementById(this._getId() + '-tooltip').innerHTML = LOC(this._tooltipLocKey);
        }
    }

    public setActive(isActive: boolean) {
        this._isActive = isActive;
        this._updateStyles();
    }

    public setLabel(label: string) {
        this._label = label;
        return this;
    }

    public tick() {
        if (this._isEnabledDelegate !== undefined) {
            const newIsEnabled = this._isEnabledDelegate();
            if (newIsEnabled != this.enabled) {
                this.setEnabled(newIsEnabled);
                this._updateStyles();
            }
        }

        if (this._isActiveDelegate !== undefined) {
            const newIsActive = this._isActiveDelegate();
            if (newIsActive !== this._isActive) {
                this._isActive = newIsActive;
                this._updateStyles();
            }
        }
    }

    protected _onEnabledChanged(): void {
        this._updateStyles();
    }

    private _isActiveDelegate?: () => boolean;
    public isActive(delegate: () => boolean) {
        this._isActiveDelegate = delegate;
        return this;
    }

    private _isEnabledDelegate?: () => boolean;
    public isEnabled(delegate: () => boolean) {
        this._isEnabledDelegate = delegate;
        return this;
    }

    public onClick(delegate: () => void) {
        this._onClick = delegate;

        return this;
    }

    public setTooltip(text: TLocalisedKey) {
        this._tooltipLocKey = text;
        return this;
    }

    public generateHTML() {
        if (this._grow) {
            return `
                <div class="struct-prop container-icon-button" style="width: unset; flex-grow: 1;" id="${this._getId()}">
                    ${this._iconSVG.outerHTML} ${this._label}
                </div>
            `;
        } else {
            if (this._tooltipLocKey === null) {
                return `
                <div class="struct-prop container-icon-button " style="aspect-ratio: 1;" id="${this._getId()}">
                    ${this._iconSVG.outerHTML} ${this._label}
                </div>
            `;
            } else {
                return `
                    <div class="struct-prop container-icon-button hover-text" style="aspect-ratio: 1;" id="${this._getId()}">
                        ${this._iconSVG.outerHTML} ${this._label}
                        <span class="tooltip-text left" id="${this._getId()}-tooltip">${LOC(this._tooltipLocKey)}</span>
                    </div>
                `;
            }
        }
    }

    public registerEvents(): void {
        const element = document.getElementById(this._getId()) as HTMLDivElement;
        ASSERT(element !== null);

        element.addEventListener('click', () => {
            if (this.enabled && this._onClick) {
                this._onClick();
            }
        });

        element.addEventListener('mouseenter', () => {
            this._setHovered(true);
            this._updateStyles();
        });

        element.addEventListener('mouseleave', () => {
            this._setHovered(false);
            this._updateStyles();
        });
    }

    public override finalise(): void {
        this._updateStyles();
    }

    private _getSVGElement() {
        const svgId = this._getId() + '-svg';
        return UIUtil.getElementById(svgId);
    }

    protected override _updateStyles() {
        UIUtil.updateStyles(this._getElement(), {
            isActive: this._isActive,
            isEnabled: this.enabled,
            isHovered: this.hovered,
        });
    }
}
