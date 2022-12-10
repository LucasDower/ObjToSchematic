import { clamp, mapRange, wayThrough } from '../../math';
import { ASSERT } from '../../util/error_util';
import { UIUtil } from '../../util/ui_util';
import { ConfigUIElement } from './config_element';

export type TSliderParams = {
    min: number,
    max: number,
    value: number,
    decimals: number,
    step: number,
}

export class SliderElement extends ConfigUIElement<number, HTMLDivElement> {
    private _min: number;
    private _max: number;
    private _decimals: number;
    private _step: number;
    private _dragging: boolean;
    private _hovering: boolean;
    private _internalValue: number;

    public constructor() {
        super();
        this._min = 0;
        this._max = 1;
        this._decimals = 1;
        this._step = 0.1;
        this._internalValue = 0.5;
        this._dragging = false;
        this._hovering = false;
    }

    public override setDefaultValue(value: number) {
        super.setDefaultValue(value);
        this._internalValue = value;
        return this;
    }

    /**
     * Set the minimum value the slider can be set to.
     */
    public setMin(min: number) {
        this._min = min;
        return this;
    }

    /**
     * Set the maximum value the slider can be set to.
     */
    public setMax(max: number) {
        this._max = max;
        return this;
    }

    /**
     * Set the number of decimals to display the value to.
     */
    public setDecimals(decimals: number) {
        this._decimals = decimals;
        return this;
    }

    /**
     * Set the step the value is increased/decreased by.
     */
    public setStep(step: number) {
        this._step = step;
        return this;
    }

    public override registerEvents() {
        const element = this._getElement();
        const elementBar = UIUtil.getElementById(this._getSliderBarId());
        const elementValue = UIUtil.getElementById(this._getSliderValueId()) as HTMLInputElement;

        element.onmouseenter = () => {
            this._hovering = true;
            if (this.getEnabled()) {
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
            if (!this._dragging && this.getEnabled()) {
                e.preventDefault();
                this._onScrollSlider(e);
            }
        });

        elementValue.addEventListener('change', () => {
            this._onTypedValue();
        });
    }

    protected override _generateInnerHTML() {
        const norm = (this._internalValue - this._min) / (this._max - this._min);

        return `
            <input type="number" id="${this._getSliderValueId()}" min="${this._min}" max="${this._max}" step="${this._step}" value="${this.getValue().toFixed(this._decimals)}">
            <div class="new-slider" id="${this._getId()}" style="flex-grow: 1;">
                <div class="new-slider-bar" id="${this._getSliderBarId()}" style="width: ${norm * 100}%;">
                </div>
            </div>
        `;
    }

    protected override _onEnabledChanged() {
        super._onEnabledChanged();

        const element = this._getElement();
        const elementBar = UIUtil.getElementById(this._getSliderBarId());
        const elementValue = UIUtil.getElementById(this._getSliderValueId()) as HTMLInputElement;

        if (this.getEnabled()) {
            element.classList.remove('new-slider-disabled');
            elementBar.classList.remove('new-slider-bar-disabled');
            elementValue.disabled = false;
        } else {
            element.classList.add('new-slider-disabled');
            elementBar.classList.add('new-slider-bar-disabled');
            elementValue.disabled = true;
        }
    }

    protected override _onValueChanged(): void {
        const percentage = wayThrough(this.getValue(), this._min, this._max);
        ASSERT(percentage >= 0.0 && percentage <= 1.0);

        UIUtil.getElementById(this._getSliderBarId()).style.width = `${percentage * 100}%`;
        (UIUtil.getElementById(this._getSliderValueId()) as HTMLInputElement).value = this.getValue().toFixed(this._decimals);
    }

    private _onScrollSlider(e: WheelEvent) {
        if (!this.getEnabled()) {
            return;
        }

        this._internalValue -= (e.deltaY / 150) * this._step;
        this._internalValue = clamp(this._internalValue, this._min, this._max);

        this._onInternalValueUpdated();
    }

    private _onDragSlider(e: MouseEvent) {
        if (!this.getEnabled()) {
            return;
        }

        const box = this._getElement().getBoundingClientRect();
        const left = box.x;
        const right = box.x + box.width;

        this._internalValue = mapRange(e.clientX, left, right, this._min, this._max);
        this._internalValue = clamp(this._internalValue, this._min, this._max);

        this._onInternalValueUpdated();
    }

    private _onTypedValue() {
        const elementValue = UIUtil.getElementById(this._getSliderValueId()) as HTMLInputElement;

        const typedNumber = parseFloat(elementValue.value);
        if (!isNaN(typedNumber)) {
            this._internalValue = clamp(typedNumber, this._min, this._max);
        }
        this._onInternalValueUpdated();
    }

    private _onInternalValueUpdated() {
        const displayString = this._internalValue!.toFixed(this._decimals);
        this._setValue(parseFloat(displayString));
    }

    /**
     * Gets the ID of the DOM element for the slider's value.
     */
    private _getSliderValueId() {
        return this._getId() + '-value';
    }

    /**
     * Gets the ID of the DOM element for the slider's bar.
     */
    private _getSliderBarId() {
        return this._getId() + '-bar';
    }
}
