import { BaseUIElement } from '../layout';
import { assert } from '../../util';
import { clamp } from '../../math';

export class SliderElement extends BaseUIElement {
    private _min: number;
    private _max: number;
    private _step: number;
    private _value: number;
    private _dragging: boolean;

    public constructor(id: string, min: number, max: number, step: number, value: number) {
        super(id);
        this._min = min;
        this._max = max;
        this._step = step;
        this._value = value;
        this._dragging = false;
    }

    public generateHTML() {
        const norm = (this._value - this._min) / (this._max - this._min);
        return `
            <div class="new-slider" id="${this._id}">
                <div class="new-slider-bar" id="${this._id}-bar"style="width: ${norm * 100}%;">
                </div>
            </div>
        `;
    }

    public registerEvents() {
        const element = document.getElementById(this._id) as HTMLDivElement;
        assert(element !== null);

        element.onmousedown = () => {
            this._dragging = true;
        };

        document.addEventListener('mousemove', (e: any) => {
            if (this._dragging) {
                this._updateValue(e);
            }
        });

        document.addEventListener('mouseup', (e: any) => {
            if (this._dragging) {
                this._updateValue(e);
            }
            this._dragging = false;
        });
    }

    private _updateValue(e: MouseEvent) {
        if (!this._isEnabled) {
            return;
        }

        const element = document.getElementById(this._id) as HTMLDivElement;
        const elementBar = document.getElementById(this._id + '-bar') as HTMLDivElement;
        assert(element !== null && elementBar !== null);

        const mouseEvent = e as MouseEvent;
        const xOffset = mouseEvent.clientX - elementBar.getBoundingClientRect().x;
        const width = element.clientWidth;
        const norm = clamp(xOffset / width, 0.0, 1.0);
        this._value = (norm * (this._max - this._min)) + this._min;
        elementBar.style.width = `${norm * 100}%`;
    }

    public getValue() {
        return this._value;
    }

    protected _onEnabledChanged() {
        const element = document.getElementById(this._id) as HTMLDivElement;
        const elementBar = document.getElementById(this._id + '-bar') as HTMLDivElement;
        assert(element !== null && elementBar !== null);

        if (this._isEnabled) {
            // element.classList.add("button");
            element.classList.remove('new-slider-disabled');
            elementBar.classList.remove('new-slider-bar-disabled');
        } else {
            element.classList.add('new-slider-disabled');
            elementBar.classList.add('new-slider-bar-disabled');
            // element.classList.remove("button");
        }
    }
}
