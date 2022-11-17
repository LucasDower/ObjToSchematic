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

    public constructor(label: string, decimals: number, value: Vector3) {
        super(label);
        this._value = value;
        this._mouseover = EAxis.None;
        this._dragging = EAxis.None;
        this._lastClientX = 0.0;
    }

    public generateInnerHTML() {
        ASSERT(this._value !== undefined, 'Value not found');
        return `
            <div style="display: flex; flex-direction: row;">
                <div style="display: flex; flex-direction: row; width: 33%">
                    <div class="spinbox-key" id="${this._id}-kx" style="background-color: #FF4C4C;">X</div>
                    <div class="spinbox-value" id="${this._id}-vx">
                        ${this._value.x}
                    </div>
                </div>
                <div class="spinbox-divider"></div>
                <div style="display: flex; flex-direction: row; width: 33%"">
                    <div class="spinbox-key" id="${this._id}-ky" style="background-color: #34BF49;">Y</div>
                    <div class="spinbox-value" id="${this._id}-vy">
                        ${this._value.y}
                    </div>
                </div>
                <div class="spinbox-divider"></div>
                <div style="display: flex; flex-direction: row; width: 33%"">
                    <div class="spinbox-key" id="${this._id}-kz" style="background-color: #0099E5;">Z</div>
                    <div class="spinbox-value" id="${this._id}-vz">
                        ${this._value.z}
                    </div>
                </div>
            </div>
        `;
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
        this._registerAxis(EAxis.Y);
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
            const elementYK = document.getElementById(this._id + '-ky') as HTMLDivElement;
            const elementZK = document.getElementById(this._id + '-kz') as HTMLDivElement;
            const elementXV = document.getElementById(this._id + '-vx') as HTMLDivElement;
            const elementYV = document.getElementById(this._id + '-vy') as HTMLDivElement;
            const elementZV = document.getElementById(this._id + '-vz') as HTMLDivElement;

            switch (this._dragging) {
                case EAxis.X:
                    elementXK.classList.remove('spinbox-key-hover');
                    elementXV.classList.remove('spinbox-value-hover');
                    break;
                case EAxis.Y:
                    elementYK.classList.remove('spinbox-key-hover');
                    elementYV.classList.remove('spinbox-value-hover');
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
        const elementYV = document.getElementById(this._id + '-vy') as HTMLDivElement;
        const elementZV = document.getElementById(this._id + '-vz') as HTMLDivElement;
        elementXV.innerHTML = this._value.x.toString();
        elementYV.innerHTML = this._value.y.toString();
        elementZV.innerHTML = this._value.z.toString();
    }

    protected _onEnabledChanged() {
        super._onEnabledChanged();

        LOG(this._label, 'is now enabled', this._isEnabled);

        const keyElements = [
            document.getElementById(this._id + '-kx') as HTMLDivElement,
            document.getElementById(this._id + '-ky') as HTMLDivElement,
            document.getElementById(this._id + '-kz') as HTMLDivElement,
        ];
        const valueElements = [
            document.getElementById(this._id + '-vx') as HTMLDivElement,
            document.getElementById(this._id + '-vy') as HTMLDivElement,
            document.getElementById(this._id + '-vz') as HTMLDivElement,
        ];

        if (this._isEnabled) {
            for (const keyElement of keyElements) {
                keyElement.classList.remove('spinbox-key-disabled');
            }
            for (const valueElement of valueElements) {
                valueElement.classList.remove('spinbox-value-disabled');
            }
        } else {
            for (const keyElement of keyElements) {
                keyElement.classList.add('spinbox-key-disabled');
            }
            for (const valueElement of valueElements) {
                valueElement.classList.add('spinbox-value-disabled');
            }
        }
    }
}
