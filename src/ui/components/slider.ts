import { clamp, mapRange, wayThrough } from '../../math';
import { ASSERT } from '../../util/error_util';
import { UIUtil } from '../../util/ui_util';
import { ConfigComponent } from './config';

export type TSliderParams = {
    min: number,
    max: number,
    value: number,
    decimals: number,
    step: number,
}

export class SliderComponent extends ConfigComponent<number, HTMLDivElement> {
    private _min: number;
    private _max: number;
    private _decimals: number;
    private _step: number;
    private _dragging: boolean;
    private _internalValue: number;
    private _valueHovered: boolean;

    public constructor() {
        super();
        this._min = 0;
        this._max = 1;
        this._decimals = 1;
        this._step = 0.1;
        this._internalValue = 0.5;
        this._dragging = false;
        this._valueHovered = false;
    }

    public setValue(value: number) {
        this._setValue(value);
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
            this._setHovered(true);
            this._updateStyles();
        };

        element.onmouseleave = () => {
            this._setHovered(false);
            this._updateStyles();
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

        elementValue.addEventListener('mouseenter', () => {
            this._valueHovered = true;
            this._updateStyles();
        });

        elementValue.addEventListener('mouseleave', () => {
            this._valueHovered = false;
            this._updateStyles();
        });
    }

    public override _generateInnerHTML() {
        const norm = (this._internalValue - this._min) / (this._max - this._min);

        return `
            <input class="struct-prop comp-slider-value" type="number" id="${this._getSliderValueId()}" min="${this._min}" max="${this._max}" step="${this._step}" value="${this.getValue().toFixed(this._decimals)}">
            <div class="struct-prop comp-slider comp-slider-outer" id="${this._getId()}">
                <div class="struct-prop comp-slider comp-slider-inner" id="${this._getSliderBarId()}" style="width: ${norm * 100}%">
                </div>
            </div>
        `;
    }

    protected override _onEnabledChanged() {
        super._onEnabledChanged();

        const elementValue = UIUtil.getElementById(this._getSliderValueId()) as HTMLInputElement;
        elementValue.disabled = this.disabled;

        const elementBar = UIUtil.getElementById(this._getSliderBarId());
        const elementSlider = UIUtil.getElementById(this._getId());
        if (this.enabled) {
            elementBar.classList.add('enabled');
            elementSlider.classList.add('enabled');
        } else {
            elementBar.classList.remove('enabled');
            elementSlider.classList.remove('enabled');
        }

        this._updateStyles();
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

    protected override _updateStyles(): void {
        const elementValue = UIUtil.getElementById(this._getSliderValueId()) as HTMLInputElement;
        UIUtil.updateStyles(elementValue, {
            isHovered: this._valueHovered,
            isActive: false,
            isEnabled: this.enabled,
        });

        const elementBar = UIUtil.getElementById(this._getSliderBarId()) as HTMLInputElement;
        UIUtil.updateStyles(elementBar, {
            isHovered: this.hovered,
            isActive: true,
            isEnabled: this.enabled,
        });

        const elementSlider = UIUtil.getElementById(this._getId()) as HTMLInputElement;
        UIUtil.updateStyles(elementSlider, {
            isHovered: this.hovered,
            isActive: false,
            isEnabled: this.enabled,
        });
    }
}
