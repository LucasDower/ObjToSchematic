import { ASSERT } from '../../../tools/misc';
import { clamp, mapRange, wayThrough } from '../../math';
import { UIUtil } from '../misc';
import { ConfigElement } from './config_element';

export type TSliderParams = {
    min: number,
    max: number,
    value: number,
    decimals: number,
    step: number,
}

export class SliderElement extends ConfigElement<number, HTMLDivElement> {
    private _min: number;
    private _max: number;
    private _decimals: number;
    private _step: number;
    private _dragging: boolean;
    private _hovering: boolean;
    private _internalValue?: number;

    public constructor() {
        super();
        this._min = 0;
        this._max = 1;
        this._decimals = 1;
        this._step = 0.1;
        this._dragging = false;
        this._hovering = false;
    }

    public setMin(min: number) {
        this._min = min;
        return this;
    }

    public setMax(max: number) {
        this._max = max;
        return this;
    }

    public setDefaultValue(value: number) {
        this._internalValue = value;
        this._setValue(value);
        return this;
    }

    public setDecimals(decimals: number) {
        this._decimals = decimals;
        return this;
    }

    public setStep(step: number) {
        this._step = step;
        return this;
    }

    private _getSliderValueId() {
        return this._getId() + '-value';
    }

    private _getSliderBarId() {
        return this._getId() + '-bar';
    }

    public generateInnerHTML() {
        ASSERT(this._internalValue !== undefined, 'Slider internal value not seet');
        const norm = (this._internalValue! - this._min) / (this._max - this._min);

        return `
            <div style="display: flex; flex-direction: row;">
                <div class="slider-value" id="${this._getSliderValueId()}">
                    ${this.getValue()}
                </div>
                <div class="new-slider" id="${this._getId()}" style="flex-grow: 1;">
                    <div class="new-slider-bar" id="${this._getSliderBarId()}" style="width: ${norm * 100}%;">
                    </div>
                </div>
            </div>
        `;
    }

    public registerEvents() {
        const element = this._getElement();
        const elementBar = UIUtil.getElementById(this._getSliderBarId());

        element.onmouseenter = () => {
            this._hovering = true;
            if (this._getIsEnabled()) {
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
            if (!this._dragging && this._getIsEnabled()) {
                e.preventDefault();
                this._onScrollSlider(e);
            }
        });
    }

    private _onScrollSlider(e: WheelEvent) {
        if (!this._getIsEnabled()) {
            return;
        }

        ASSERT(this._internalValue !== undefined, 'Slider internal value not set');
        this._internalValue! -= (e.deltaY / 150) * this._step;
        this._internalValue = clamp(this._internalValue!, this._min, this._max);

        this._onInternalValueUpdated();
    }

    private _onDragSlider(e: MouseEvent) {
        if (!this._getIsEnabled()) {
            return;
        }

        const box = this._getElement().getBoundingClientRect();
        const left = box.x;
        const right = box.x + box.width;

        this._internalValue = mapRange(e.clientX, left, right, this._min, this._max);
        this._internalValue = clamp(this._internalValue, this._min, this._max);

        this._onInternalValueUpdated();
    }

    private _onInternalValueUpdated() {
        const displayString = this._internalValue!.toFixed(this._decimals);

        const norm = wayThrough(this._internalValue!, this._min, this._max);
        UIUtil.getElementById(this._getSliderBarId()).style.width = `${norm * 100}%`;
        UIUtil.getElementById(this._getSliderValueId()).innerHTML = this.getValue().toFixed(this._decimals);

        this._setValue(parseFloat(displayString));
    }

    protected _onEnabledChanged() {
        super._onEnabledChanged();

        const element = this._getElement();
        const elementBar = UIUtil.getElementById(this._getSliderBarId());
        const elementValue = UIUtil.getElementById(this._getSliderValueId());

        if (this._getIsEnabled()) {
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
