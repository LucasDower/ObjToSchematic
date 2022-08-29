import { ASSERT } from '../../util';

export abstract class BaseUIElement<Type> {
    protected _id: string;
    protected _isEnabled: boolean;
    protected _value?: Type;
    protected _cachedValue?: any;

    constructor() {
        this._id = '_' + Math.random().toString(16);
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

    public getValue() {
        ASSERT(this._value);
        return this._value;
    }

    public cacheValue() {
        this._cachedValue = this.getValue();
    }

    public getElement() {
        const element = document.getElementById(this._id);
        ASSERT(element !== null, 'Getting element that does not exist');
        return element;
    }

    public abstract generateHTML(): string;
    public abstract registerEvents(): void;
    

    protected abstract _onEnabledChanged(): void;
}
