import { ASSERT } from '../../util/error_util';
import { BaseUIElement } from './base';

export class ButtonElement extends BaseUIElement<any> {
    private _onClick: () => void;

    public constructor(label: string, onClick: () => void) {
        super(label);
        this._onClick = onClick;
        this._isEnabled = true;
    }

    public generateHTML() {
        return `
            <div class="button" id="${this._id}">
                <div class="button-label">${this._label}</div>
                <div class="button-progress" id="${this._id}-progress"></div>
            </div>
        `;
    }

    public registerEvents(): void {
        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null);

        element.addEventListener('click', () => {
            if (this._isEnabled) {
                this._onClick();
            }
        });
    }

    protected _onEnabledChanged() {
        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null);

        if (this._isEnabled) {
            element.classList.remove('button-disabled');
        } else {
            element.classList.add('button-disabled');
        }
    }

    public setLabelOverride(label: string) {
        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null, 'Updating label override of element that does not exist');

        element.innerHTML = label;
        return this;
    }

    public removeLabelOverride() {
        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null, 'Removing label override of element that does not exist');

        element.innerHTML = this._label;
        return this;
    }

    /**
     * Set the progress bar progress.
     * @param progress A number between 0.0 and 1.0 inclusive.
     */
    public setProgress(progress: number) {
        const element = document.getElementById(this._id + '-progress') as HTMLDivElement;
        ASSERT(element !== null);

        element.style.width = `${progress * 100}%`;
        return this;
    }

    public startLoading() {
        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null);

        element.classList.add('button-loading');
        return this;
    }

    public stopLoading() {
        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null);

        element.classList.remove('button-loading');
        return this;
    }
}
