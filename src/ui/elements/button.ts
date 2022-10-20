import { ASSERT } from '../../../tools/misc';
import { TLocString } from '../../util/type_util';
import { UIUtil } from '../misc';
import { BaseUIElement } from './base_element';

export class ButtonElement extends BaseUIElement<HTMLDivElement> {
    private _label?: TLocString;
    private _onClick?: () => void;

    public constructor() {
        super();
    }

    public setOnClick(delegate: () => void) {
        this._onClick = delegate;
        return this;
    }

    public setLabel(label: TLocString) {
        this._label = label;
        return this;
    }

    private _getProgressBarId() {
        return this._getId() + '-progress';
    }

    public generateHTML() {
        return `
            <div class="button" id="${this._getId()}">
                <div class="btn">${this._label}</div>
                <div class="progress" id="${this._getProgressBarId()}"></div>
            </div>
        `;
    }

    public registerEvents(): void {
        this._getElement().addEventListener('click', () => {
            if (this._getIsEnabled()) {
                this._onClick?.();
            }
        });
    }

    protected _onEnabledChanged() {
        if (this._getIsEnabled()) {
            this._getElement().classList.remove('button-disabled');
        } else {
            this._getElement().classList.add('button-disabled');
        }
    }

    /**
     * Override the current label with a new value
     */
    public setLabelOverride(label: string) {
        this._getElement().innerHTML = label;
        return this;
    }

    /**
     * Remove the label override and set the label back to its default
     */
    public removeLabelOverride() {
        ASSERT(this._label !== undefined, 'No base button label');
        this._getElement().innerHTML = this._label!;
        return this;
    }

    /**
     * Start the loading animation
     */
    public startLoading() {
        this._getElement().classList.add('button-loading');
        return this;
    }

    /**
     * Set the progress bar progress.
     * @param progress A number between 0.0 and 1.0 inclusive.
     */
    public setProgress(progress: number) {
        const progressBarElement = UIUtil.getElementById(this._getProgressBarId());
        progressBarElement.style.width = `${progress * 100}%`;
        return this;
    }

    /**
     * Stop the loading animation
     */
    public stopLoading() {
        this._getElement().classList.remove('button-loading');
        return this;
    }
}
