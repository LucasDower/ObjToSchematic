import { ASSERT } from '../../util/error_util';
import { TAxis } from '../../util/type_util';
import { UIUtil } from '../../util/ui_util';
import { Vector3 } from '../../vector';
import { ConfigUIElement } from './config_element';

export class VectorSpinboxElement extends ConfigUIElement<Vector3, HTMLDivElement> {
    private _mouseover: TAxis | null;
    private _dragging: TAxis | null;
    private _lastClientX: number;
    private _showY: boolean;

    public constructor() {
        super();
        this._mouseover = null;
        this._dragging = null;
        this._lastClientX = 0.0;
        this._showY = true;
    }

    /**
     * Set whether or not the Y axis has a UI element
     */
    public setShowY(showY: boolean) {
        this._showY = showY;
    }

    protected override _generateInnerHTML() {
        let html = '';
        html += '<div class="spinbox-main-container">';
        html += `
            <div class="spinbox-element-container">
                <div class="spinbox-key" id="${this._getKeyId('x')}">X</div>
                <div class="spinbox-value" id="${this._getValueId('x')}">
                    ${this.getValue().x}
                </div>
            </div>
        `;
        if (this._showY) {
            html += `
                <div class="spinbox-element-container">
                    <div class="spinbox-key" id="${this._getKeyId('y')}">Y</div>
                    <div class="spinbox-value" id="${this._getValueId('y')}">
                        ${this.getValue().y}
                    </div>
                </div>
            `;
        }
        html += `
            <div class="spinbox-element-container">
                <div class="spinbox-key" id="${this._getKeyId('z')}">Z</div>
                <div class="spinbox-value" id="${this._getValueId('z')}">
                    ${this.getValue().z}
                </div>
            </div>
        `;
        html += '</div>';
        return html;
    }

    private _getKeyId(axis: TAxis) {
        return this._getId() + '-k' + axis;
    }

    private _getValueId(axis: TAxis) {
        return this._getId() + '-v' + axis;
    }

    private _registerAxis(axis: TAxis) {
        const elementKey = UIUtil.getElementById(this._getKeyId(axis));
        const elementValue = UIUtil.getElementById(this._getValueId(axis));

        elementKey.onmouseenter = () => {
            this._mouseover = axis;
            if (this.getEnabled()) {
                elementKey.classList.add('spinbox-key-hover');
                elementValue.classList.add('spinbox-value-hover');
            }
        };

        elementValue.onmouseenter = () => {
            this._mouseover = axis;
            if (this.getEnabled()) {
                elementKey.classList.add('spinbox-key-hover');
                elementValue.classList.add('spinbox-value-hover');
            }
        };

        elementKey.onmouseleave = () => {
            this._mouseover = null;
            if (this._dragging !== axis) {
                elementKey.classList.remove('spinbox-key-hover');
                elementValue.classList.remove('spinbox-value-hover');
            }
        };

        elementValue.onmouseleave = () => {
            this._mouseover = null;
            if (this._dragging !== axis) {
                elementKey.classList.remove('spinbox-key-hover');
                elementValue.classList.remove('spinbox-value-hover');
            }
        };
    }

    public registerEvents() {
        this._registerAxis('x');
        if (this._showY) {
            this._registerAxis('y');
        }
        this._registerAxis('z');

        document.addEventListener('mousedown', (e: any) => {
            if (this.getEnabled() && this._mouseover !== null) {
                this._dragging = this._mouseover;
                this._lastClientX = e.clientX;
            }
        });

        document.addEventListener('mousemove', (e: any) => {
            if (this.getEnabled() && this._dragging !== null) {
                this._updateValue(e);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this._dragging !== null) {
                const elementKey = UIUtil.getElementById(this._getKeyId(this._dragging));
                const elementValue = UIUtil.getElementById(this._getKeyId(this._dragging));
                elementKey.classList.remove('spinbox-key-hover');
                elementValue.classList.remove('spinbox-value-hover');
            }

            this._dragging = null;
        });
    }

    private _updateValue(e: MouseEvent) {
        ASSERT(this.getEnabled(), 'Not enabled');
        ASSERT(this._dragging !== null, 'Dragging nothing');

        const deltaX = e.clientX - this._lastClientX;
        this._lastClientX = e.clientX;

        const current = this.getValue().copy();

        switch (this._dragging) {
            case 'x':
                current.x += deltaX;
                break;
            case 'y':
                current.y += deltaX;
                break;
            case 'z':
                current.z += deltaX;
                break;
        }
        this._setValue(current);
    }

    protected override _onEnabledChanged() {
        super._onEnabledChanged();

        const keyElements = [
            UIUtil.getElementById(this._getKeyId('x')),
            UIUtil.getElementById(this._getKeyId('y')),
            UIUtil.getElementById(this._getKeyId('z')),
        ];
        const valueElements = [
            UIUtil.getElementById(this._getValueId('x')),
            UIUtil.getElementById(this._getValueId('y')),
            UIUtil.getElementById(this._getValueId('z')),
        ];

        if (this.getEnabled()) {
            for (const keyElement of keyElements) {
                keyElement?.classList.remove('spinbox-key-disabled');
            }
            for (const valueElement of valueElements) {
                valueElement?.classList.remove('spinbox-value-disabled');
            }
        } else {
            for (const keyElement of keyElements) {
                keyElement?.classList.add('spinbox-key-disabled');
            }
            for (const valueElement of valueElements) {
                valueElement?.classList.add('spinbox-value-disabled');
            }
        }
    }

    protected override _onValueChanged(): void {
        const elementXV = UIUtil.getElementById(this._getValueId('x'));
        const elementYV = UIUtil.getElementById(this._getValueId('y'));
        const elementZV = UIUtil.getElementById(this._getValueId('z'));

        const current = this.getValue().copy();

        elementXV.innerHTML = current.x.toString();
        if (elementYV) {
            elementYV.innerHTML = current.y.toString();
        }
        elementZV.innerHTML = current.z.toString();
    }
}
