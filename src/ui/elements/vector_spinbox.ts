import { ASSERT } from '../../util/error_util';
import { LOG } from '../../util/log_util';
import { Vector3 } from '../../vector';
import { LabelledElement } from './labelled_element';

/* eslint-disable */
enum EAxis {
    None = 'none',
    X = 'x',
    Y = 'y',
    Z = 'z',
};
/* eslint-enable */

export class VectorSpinboxElement extends LabelledElement<Vector3> {
    private _mouseover: EAxis;
    private _dragging: EAxis;
    private _lastClientX: number;
    private _showY: boolean;

    public constructor(label: string, decimals: number, value: Vector3, showY: boolean) {
        super(label);
        this._value = value;
        this._mouseover = EAxis.None;
        this._dragging = EAxis.None;
        this._lastClientX = 0.0;
        this._showY = showY;
    }

    public generateInnerHTML() {
        ASSERT(this._value !== undefined, 'Value not found');
        let html = '';
        html += '<div class="spinbox-main-container">';
        html += `
            <div class="spinbox-element-container">
                <div class="spinbox-key" id="${this._id}-kx">X</div>
                <div class="spinbox-value" id="${this._id}-vx">
                    ${this._value.x}
                </div>
            </div>
        `;
        if (this._showY) {
            html += `
                <div class="spinbox-element-container">
                    <div class="spinbox-key" id="${this._id}-ky">Y</div>
                    <div class="spinbox-value" id="${this._id}-vy">
                        ${this._value.y}
                    </div>
                </div>
            `;
        }
        html += `
            <div class="spinbox-element-container">
                <div class="spinbox-key" id="${this._id}-kz">Z</div>
                <div class="spinbox-value" id="${this._id}-vz">
                    ${this._value.z}
                </div>
            </div>
        `;
        html += '</div>';
        return html;
    }

    private _registerAxis(axis: EAxis) {
        ASSERT(axis !== EAxis.None);

        const elementXK = document.getElementById(this._id + '-k' + axis) as HTMLDivElement;
        const elementXV = document.getElementById(this._id + '-v' + axis) as HTMLDivElement;
        ASSERT(elementXK !== null && elementXV !== null);

        elementXK.onmouseenter = () => {
            this._mouseover = axis;
            if (this._isEnabled) {
                elementXK.classList.add('spinbox-key-hover');
                elementXV.classList.add('spinbox-value-hover');
            }
        };

        elementXV.onmouseenter = () => {
            this._mouseover = axis;
            if (this._isEnabled) {
                elementXK.classList.add('spinbox-key-hover');
                elementXV.classList.add('spinbox-value-hover');
            }
        };

        elementXK.onmouseleave = () => {
            this._mouseover = EAxis.None;
            if (this._dragging !== axis) {
                elementXK.classList.remove('spinbox-key-hover');
                elementXV.classList.remove('spinbox-value-hover');
            }
        };

        elementXV.onmouseleave = () => {
            this._mouseover = EAxis.None;
            if (this._dragging !== axis) {
                elementXK.classList.remove('spinbox-key-hover');
                elementXV.classList.remove('spinbox-value-hover');
            }
        };
    }

    public registerEvents() {
        this._registerAxis(EAxis.X);
        if (this._showY) {
            this._registerAxis(EAxis.Y);
        }
        this._registerAxis(EAxis.Z);

        document.addEventListener('mousedown', (e: any) => {
            if (this._isEnabled && this._mouseover !== EAxis.None) {
                this._dragging = this._mouseover;
                this._lastClientX = e.clientX;
            }
        });

        document.addEventListener('mousemove', (e: any) => {
            if (this._isEnabled && this._dragging !== EAxis.None) {
                this._updateValue(e);
            }
        });

        document.addEventListener('mouseup', () => {
            const elementXK = document.getElementById(this._id + '-kx') as HTMLDivElement;
            const elementYK = document.getElementById(this._id + '-ky') as (HTMLDivElement | undefined);
            const elementZK = document.getElementById(this._id + '-kz') as HTMLDivElement;
            const elementXV = document.getElementById(this._id + '-vx') as HTMLDivElement;
            const elementYV = document.getElementById(this._id + '-vy') as (HTMLDivElement | undefined);
            const elementZV = document.getElementById(this._id + '-vz') as HTMLDivElement;

            switch (this._dragging) {
                case EAxis.X:
                    elementXK?.classList.remove('spinbox-key-hover');
                    elementXV.classList.remove('spinbox-value-hover');
                    break;
                case EAxis.Y:
                    elementYK?.classList.remove('spinbox-key-hover');
                    elementYV?.classList.remove('spinbox-value-hover');
                    break;
                case EAxis.Z:
                    elementZK.classList.remove('spinbox-key-hover');
                    elementZV.classList.remove('spinbox-value-hover');
                    break;
            }
            this._dragging = EAxis.None;
        });
    }

    private _updateValue(e: MouseEvent) {
        ASSERT(this._isEnabled, 'Not enabled');
        ASSERT(this._dragging !== EAxis.None, 'Dragging nothing');
        ASSERT(this._value !== undefined, 'No value to update');

        const deltaX = e.clientX - this._lastClientX;
        this._lastClientX = e.clientX;

        switch (this._dragging) {
            case EAxis.X:
                this._value.x += deltaX;
                break;
            case EAxis.Y:
                this._value.y += deltaX;
                break;
            case EAxis.Z:
                this._value.z += deltaX;
                break;
        }

        const elementXV = document.getElementById(this._id + '-vx') as HTMLDivElement;
        const elementYV = document.getElementById(this._id + '-vy') as (HTMLDivElement | undefined);
        const elementZV = document.getElementById(this._id + '-vz') as HTMLDivElement;
        elementXV.innerHTML = this._value.x.toString();
        if (elementYV) {
            elementYV.innerHTML = this._value.y.toString();
        }
        elementZV.innerHTML = this._value.z.toString();
    }

    protected _onEnabledChanged() {
        super._onEnabledChanged();

        LOG(this._label, 'is now enabled', this._isEnabled);

        const keyElements = [
            document.getElementById(this._id + '-kx') as HTMLDivElement,
            document.getElementById(this._id + '-ky') as (HTMLDivElement | undefined),
            document.getElementById(this._id + '-kz') as HTMLDivElement,
        ];
        const valueElements = [
            document.getElementById(this._id + '-vx') as HTMLDivElement,
            document.getElementById(this._id + '-vy') as (HTMLDivElement | undefined),
            document.getElementById(this._id + '-vz') as HTMLDivElement,
        ];

        if (this._isEnabled) {
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
}
