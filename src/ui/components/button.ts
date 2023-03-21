import { UIUtil } from '../../util/ui_util';
import { BaseComponent } from './base';

export class ButtonComponent extends BaseComponent<HTMLDivElement> {
    private _label: string;
    private _onClick: () => void;

    public constructor() {
        super();
        this._label = 'Unknown';
        this._onClick = () => { };
    }

    /**
     * Sets the delegate that is called when this button is clicked.
     */
    public setOnClick(delegate: () => void) {
        this._onClick = delegate;
        return this;
    }

    /**
     * Sets the label of this button.
     */
    public setLabel(label: string) {
        this._label = label;
        return this;
    }

    /**
     * Override the current label with a new value.
     */
    public setLabelOverride(label: string) {
        this._getElement().innerHTML = label;
        return this;
    }

    /**
     * Remove the label override and set the label back to its default
     */
    public removeLabelOverride() {
        this._getElement().innerHTML = this._label;
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

    public override generateHTML() {
        return `
            <div class="container-button">
                <div class="struct-prop button" id="${this._getId()}">
                    <div class="button-label">${this._label}</div>
                    <div class="button-progress" id="${this._getProgressBarId()}"></div>
                </div>
            </div>
        `;
    }

    public override registerEvents(): void {
        this._getElement().addEventListener('click', () => {
            if (this.enabled) {
                this._onClick?.();
            }
        });

        this._getElement().addEventListener('mouseenter', () => {
            this._setHovered(true);
            this._updateStyles();
        });

        this._getElement().addEventListener('mouseleave', () => {
            this._setHovered(false);
            this._updateStyles();
        });
    }

    protected override _onEnabledChanged() {
        this._updateStyles();
    }

    public override finalise(): void {
        this._updateStyles();
    }

    /**
     * Gets the ID of the DOM element for the button's progress bar.
     */
    private _getProgressBarId() {
        return this._getId() + '-progress';
    }

    protected _updateStyles(): void {
        UIUtil.updateStyles(this._getElement(), {
            isActive: true,
            isEnabled: this.enabled,
            isHovered: this.hovered,
        });
    }
}
