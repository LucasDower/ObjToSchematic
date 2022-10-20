import { getRandomID } from '../../util';
import { UIUtil } from '../misc';

export abstract class BaseUIElement<T> {
    private _id: string;
    private _isEnabled: boolean;

    public constructor() {
        this._id = getRandomID();
        this._isEnabled = true;
    }

    protected _getElement() {
        return UIUtil.getElementById(this._id) as T;
    }

    protected _getId() {
        return this._id;
    }

    protected _getIsEnabled() {
        return this._isEnabled;
    }

    /**
     * Set whether or not this UI element is interactable
     */
    public setEnabled(isEnabled: boolean) {
        this._isEnabled = isEnabled;
        this._onEnabledChanged();
    }

    /**
     * The actual HTML that represents this UI element.
     */
    public abstract generateHTML(): string;

    /**
     * A delegate that is called after the UI element has been added to the DOM.
     * Calls to .addEventListener should be placed here.
     */
    public abstract registerEvents(): void;

    /**
     * A delegate that is called when the enabled status is changed
     */
    protected abstract _onEnabledChanged(): void;
}
