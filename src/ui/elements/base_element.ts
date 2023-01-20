import { getRandomID } from '../../util';
import { UIUtil } from '../../util/ui_util';

/**
 * The base UI class from which user interactable DOM elements are built from.
 * Each `BaseUIElement` can be enabled/disabled.
 */
export abstract class BaseUIElement<T> {
    private _id: string;
    private _isEnabled: boolean;
    private _obeyGroupEnables: boolean;

    public constructor() {
        this._id = getRandomID();
        this._isEnabled = true;
        this._obeyGroupEnables = true;
    }

    /**
     * Get whether or not this UI element is interactable.
     */
    public getEnabled() {
        return this._isEnabled;
    }

    /**
     * Set whether or not this UI element is interactable.
     */
    public setEnabled(isEnabled: boolean, isGroupEnable: boolean = true) {
        if (isGroupEnable && !this._obeyGroupEnables) {
            return;
        }
        this._isEnabled = isEnabled;
        this._onEnabledChanged();
    }

    /**
     * Sets whether or not this element should be enabled when the group
     * is it apart of becomes enabled. This is useful if an element should
     * only be enabled if another element has a particular value. If this is
     * false then there needs to be a some event added to manually enable this
     * element.
     */
    public setShouldObeyGroupEnables(obey: boolean) {
        this._obeyGroupEnables = obey;
    }

    /**
     * The actual HTML that represents this UI element. It is recommended to
     * give the outermost element that ID generated for this BaseUIElement so
     * that `getElement()` returns all elements created here.
     */
    public abstract generateHTML(): string;

    /**
     * A delegate that is called after the UI element has been added to the DOM.
     * Calls to `addEventListener` should be placed here.
     */
    public abstract registerEvents(): void;

    public finalise(): void {
        this._onEnabledChanged();
    }

    /**
     * Returns the actual DOM element that this BaseUIElement refers to.
     * Calling this before the element is created (i.e. before `generateHTML`)
     * is called will throw an error.
     */
    protected _getElement() {
        return UIUtil.getElementById(this._id) as T;
    }

    /**
     * Each BaseUIElement is assignd an ID that can be used a DOM element with.
     */
    protected _getId() {
        return this._id;
    }

    /**
     * A delegate that is called when the enabled status is changed.
     */
    protected abstract _onEnabledChanged(): void;
}
