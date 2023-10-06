import { TAxis } from '../../../../Core/src/util/type_util';
import { UIUtil } from '../../util/ui_util';
import { Vector3 } from '../../../../Core/src/vector';
import { ConfigComponent } from './config';

export class VectorComponent extends ConfigComponent<Vector3, HTMLDivElement> {
    private _mouseover: TAxis | null;
    private _showY: boolean;
    private _onMouseEnterExit?: (state: 'enter' | 'exit', component: TAxis) => void;

    public constructor() {
        super(new Vector3(0, 0, 0));
        this._mouseover = null;
        this._showY = true;
    }

    /**
     * Set whether or not the Y axis has a UI element
     */
    public setShowY(showY: boolean) {
        this._showY = showY;
        return this;
    }

    protected override _generateInnerHTML() {
        let html = '';
        html += '<div class="spinbox-main-container">';
        html += `
            <div class="spinbox-element-container">
                <div class="spinbox-key" id="${this._getKeyId('x')}">X</div>
                <input type="number" class="spinbox-value struct-prop" min="-360" max="360" value="${this.getValue().x}" id="${this._getValueId('x')}"></input>
            </div>
        `;
        if (this._showY) {
            html += `
                <div class="spinbox-element-container">
                    <div class="spinbox-key" id="${this._getKeyId('y')}">Y</div>
                    <input type="number" class="spinbox-value struct-prop" min="-360" max="360" value="${this.getValue().y}" id="${this._getValueId('y')}"></input>
                </div>
            `;
        }
        html += `
            <div class="spinbox-element-container">
                <div class="spinbox-key" id="${this._getKeyId('z')}">Z</div>
                <input type="number" class="spinbox-value struct-prop" min="-360" max="360" value="${this.getValue().z}" id="${this._getValueId('z')}"></input>
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
        const elementValue = UIUtil.getElementById(this._getValueId(axis));

        elementValue.onmouseenter = () => {
            this._mouseover = axis;
            this._updateStyles();
            this._onMouseEnterExit?.('enter', axis);
        };

        elementValue.onmouseleave = () => {
            this._mouseover = null;
            this._updateStyles();
            this._onMouseEnterExit?.('exit', axis);
        };
    }

    public registerEvents() {
        this._registerAxis('x');
        if (this._showY) {
            this._registerAxis('y');
        }
        this._registerAxis('z');

        const elementX = UIUtil.getElementById(this._getValueId('x')) as HTMLInputElement;
        const elementY = UIUtil.getElementById(this._getValueId('y')) as HTMLInputElement;
        const elementZ = UIUtil.getElementById(this._getValueId('z')) as HTMLInputElement;

        elementX.addEventListener('change', () => {
            this.getValue().x = parseInt(elementX.value);
        });
        elementY.addEventListener('change', () => {
            this.getValue().y = parseInt(elementY.value);
        });
        elementZ.addEventListener('change', () => {
            this.getValue().z = parseInt(elementZ.value);
        });
    }

    public setOnMouseEnterExit(delegate: (state: 'enter' | 'exit', component: TAxis) => void) {
        this._onMouseEnterExit = delegate;
        return this;
    }

    private _updateValue(e: MouseEvent) {
        /*
        ASSERT(this.enabled, 'Not enabled');
        ASSERT(this._dragging !== null, 'Dragging nothing');

        const deltaX = e.clientX - this._lastClientX;
        this._lastClientX = e.clientX;

        const current = this.getValue().copy();

        switch (this._dragging) {
            case 'x':
                current.x = (current.x + deltaX) % this._wrap;
                break;
            case 'y':
                current.y = (current.y + deltaX) % this._wrap;
                break;
            case 'z':
                current.z = (current.z + deltaX) % this._wrap;
                break;
        }
        this._setValue(current);
        */
    }

    protected override _updateStyles(): void {
        // Update keys
        {
            const elementXK = UIUtil.getElementById(this._getKeyId('x'));
            elementXK.classList.remove('text-standard');
            elementXK.classList.add(this.enabled ? 'text-standard' : 'text-dark');

            const elementYK = UIUtil.getElementById(this._getKeyId('y'));
            elementYK.classList.remove('text-standard');
            elementYK.classList.add(this.enabled ? 'text-standard' : 'text-dark');

            const elementZK = UIUtil.getElementById(this._getKeyId('z'));
            elementZK.classList.remove('text-standard');
            elementZK.classList.add(this.enabled ? 'text-standard' : 'text-dark');
        }

        const elementXV = UIUtil.getElementById(this._getValueId('x'));
        const elementYV = UIUtil.getElementById(this._getValueId('y'));
        const elementZV = UIUtil.getElementById(this._getValueId('z'));

        // Update styles
        {
            UIUtil.updateStyles(elementXV, {
                isActive: false,
                isEnabled: this.enabled,
                isHovered: this._mouseover === 'x',
            });

            UIUtil.updateStyles(elementYV, {
                isActive: false,
                isEnabled: this.enabled,
                isHovered: this._mouseover === 'y',
            });

            UIUtil.updateStyles(elementZV, {
                isActive: false,
                isEnabled: this.enabled,
                isHovered: this._mouseover === 'z',
            });
        }
    }

    protected override _onEnabledChanged() {
        super._onEnabledChanged();
        this._updateStyles();
    }

    protected override _onValueChanged(): void {
        this._updateStyles();
    }
}
