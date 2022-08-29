import { InteractableElement } from './elements/interactable';

export abstract class ToggleableElement<T> extends InteractableElement<T> {
    public registerEvents(): void {
        super.registerEvents();
        
        this.getElement().addEventListener('click', () => {
            if (this._isEnabled) {
                this.setActive(!this.getIsActive());
            }
        });
    }

    protected _onEnabledChanged(): void {
        super._onEnabledChanged();
    }
}
