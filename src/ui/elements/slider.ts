import { ASSERT } from '../../util';
import { clamp, mapRange, wayThrough } from '../../math';
import { LabelledElement } from './labelled_element';

export class SliderElement extends LabelledElement<number> {
    private _min: number;
    private _max: number;
    private _decimals: number;
    private _dragging: boolean;
    private _step: number;
    private _hovering: boolean;

    public constructor(label: string, min: number, max: number, decimals: number, value: number, step: number) {
        super(label);
        this._min = min;
        this._max = max;
        this._decimals = decimals;
        this._value = value;
        this._step = step;
        this._dragging = false;
        this._hovering = false;
    }

    public generateInnerHTML() {
        const norm = (this.getValue() - this._min) / (this._max - this._min);
        return `
            <div style="display: flex; flex-direction: row;">
                <div class="slider-value" id="${this._id + '-value'}">
                    ${this._value}
                </div>
                <div class="new-slider" id="${this._id}" style="flex-grow: 1;">
                    <div class="new-slider-bar" id="${this._id}-bar"style="width: ${norm * 100}%;">
                    </div>
                </div>
            </div>
        `;
    }

    public registerEvents() {
        const element = document.getElementById(this._id) as HTMLDivElement;
        const elementBar = document.getElementById(this._id + '-bar') as HTMLDivElement;
        ASSERT(element !== null);

        element.onmouseenter = () => {
            this._hovering = true;
            if (this._isEnabled) {
                element.classList.add('new-slider-hover');
                elementBar.classList.add('new-slider-bar-hover');
            }
        };

        element.onmouseleave = () => {
            this._hovering = false;
            if (!this._dragging) {
                element.classList.remove('new-slider-hover');
                elementBar.classList.remove('new-slider-bar-hover');
            }
        };

        element.onmousedown = () => {
            this._dragging = true;
        };

        document.addEventListener('mousemove', (e: MouseEvent) => {
            if (this._dragging) {
                this._onDragSlider(e);
            }
        });

        document.addEventListener('mouseup', (e: MouseEvent) => {
            if (this._dragging) {
                this._onDragSlider(e);
            }
            if (!this._hovering) {
                element.classList.remove('new-slider-hover');
                elementBar.classList.remove('new-slider-bar-hover');
            }
            this._dragging = false;
        });

        element.addEventListener('wheel', (e: WheelEvent) => {
            if (!this._dragging && this._isEnabled) {
                e.preventDefault();
                this._onScrollSlider(e);
            }
        });
    }

    private _onScrollSlider(e: WheelEvent) {
        if (!this._isEnabled) {
            return;
        }
        ASSERT(this._value);

        this._value -= (e.deltaY / 150) * this._step;
        this._value = clamp(this._value, this._min, this._max);

        this._onValueUpdated();
    }

    private _onDragSlider(e: MouseEvent) {
        if (!this._isEnabled) {
            return;
        }

        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null);

        const box = element.getBoundingClientRect();
        const left = box.x;
        const right = box.x + box.width;
        
        this._value = mapRange(e.clientX, left, right, this._min, this._max);
        this._value = clamp(this._value, this._min, this._max);

        this._onValueUpdated();
    }

    private _onValueUpdated() {
        const elementBar = document.getElementById(this._id + '-bar') as HTMLDivElement;
        const elementValue = document.getElementById(this._id + '-value') as HTMLDivElement;
        ASSERT(elementBar !== null && elementValue !== null);

        const norm = wayThrough(this.getValue(), this._min, this._max);
        elementBar.style.width = `${norm * 100}%`;
        elementValue.innerHTML = this.getValue().toFixed(this._decimals);
    }

    public getDisplayValue() {
        return parseFloat(this.getValue().toFixed(this._decimals));
    }

    protected _onEnabledChanged() {
        super._onEnabledChanged();

        const element = document.getElementById(this._id) as HTMLDivElement;
        const elementBar = document.getElementById(this._id + '-bar') as HTMLDivElement;
        const elementValue = document.getElementById(this._id + '-value') as HTMLDivElement;
        ASSERT(element !== null && elementBar !== null && elementValue !== null);

        if (this._isEnabled) {
            element.classList.remove('new-slider-disabled');
            elementBar.classList.remove('new-slider-bar-disabled');
            elementValue.classList.remove('slider-value-disabled');
        } else {
            element.classList.add('new-slider-disabled');
            elementBar.classList.add('new-slider-bar-disabled');
            elementValue.classList.add('slider-value-disabled');
        }
    }
}
