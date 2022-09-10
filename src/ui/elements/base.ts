import { ASSERT } from "../../util/error_util";

export abstract class BaseUIElement<Type> {
    protected _id: string;
    protected _label: string;
    protected _isEnabled: boolean;
    protected _value?: Type;
    protected _cachedValue?: any;

    constructor(label: string) {
        this._id = '_' + Math.random().toString(16);
        this._label = label;
        this._isEnabled = true;
    }

    public setEnabled(isEnabled: boolean) {
        this._isEnabled = isEnabled;
        this._onEnabledChanged();
    }

    public getCachedValue(): Type {
        ASSERT(this._cachedValue !== undefined, 'Attempting to access value before cached');
        return this._cachedValue as Type;
    }

    protected getValue() {
        ASSERT(this._value);
        return this._value;
    }

    public cacheValue() {
        this._cachedValue = this.getValue();
    }

    public abstract generateHTML(): string;
    public abstract registerEvents(): void;
    

    protected abstract _onEnabledChanged(): void;
}
