import { BaseUIElement } from './base';

export abstract class InteractableElement<T> extends BaseUIElement<T> {
    private _isHovering: boolean;
    private _isActive: boolean;
    private _stateValue: number;

    public constructor(initiallyActive: boolean) {
        super();

        this._isHovering = false;
        this._isActive = initiallyActive;

        this._stateValue = this._getStateValue();
    }

    public setActive(isActive: boolean) {
        this._isActive = isActive;
        this._onActiveChanged();
    }

    public getIsActive() {
        return this._isActive;
    }

    public generateHTML(): string {
        return `
            <div class="interactable interactable-base" id="${this._id}">
                ${this._generateChildHTML()}
            </div>
        `;
    }

    private _onActiveChangedDelegates: Array<() => void> = [];
    public registerOnActiveChanged(delegate: () => void) {
        this._onActiveChangedDelegates.push(delegate);
    }

    public registerEvents(): void {
        this.getElement().addEventListener('mouseenter', () => {
            this._isHovering = true;
        });
        
        this.getElement().addEventListener('mouseleave', () => {
            this._isHovering = false;
        });

        document.addEventListener('mousemove', () => {
            this._updateState();
        });
    }

    private _updateState() {
        if (this._getStateValue() !== this._stateValue) {
            this._stateValue = this._getStateValue();
            this._updateStyle();
        }
    }

    private _getStateValue(): number {
        let number = 0;
        number += 4 * (this._isActive ? 1 : 0);
        number += 2 * (this._isEnabled ? 1 : 0);
        number += 1 * (this._isHovering ? 1 : 0);
        return number;
    }

    private _onActiveChanged(): void {
        this._onActiveChangedDelegates.forEach((delegate) => {
            delegate();
        });
        this._updateState();
    }

    protected _onEnabledChanged(): void {
        this._updateState();
    }

    protected abstract _generateChildHTML(): string;

    private _updateStyle() {
        const element = this.getElement();
        
        element.classList.remove('interactable');
        element.classList.remove('interactable-hover');
        element.classList.remove('interactable-disabled');
        element.classList.remove('interactable-active');
        element.classList.remove('interactable-active-hover');
        element.classList.remove('interactable-active-disabled');

        if (this._isActive) {
            if (this._isEnabled) {
                if (this._isHovering) {
                    // Active & Hovering
                    element.classList.add('interactable-active-hover');
                } else {
                    // Active
                    element.classList.add('interactable-active');
                }
            } else {
                // Active & Disabled
                element.classList.add('interactable-active-disabled');
            }
        } else {
            if (this._isEnabled) {
                if (this._isHovering) {
                    // Hovering
                    element.classList.add('interactable-hover');
                } else {
                    // (Default State)
                    element.classList.add('interactable');
                }
            } else {
                // Disabled
                element.classList.add('interactable-disabled');
            }
        }
    }
}
