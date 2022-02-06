export abstract class BaseUIElement {
    protected _id: string;
    protected _label: string;
    protected _isEnabled: boolean;

    constructor(label: string) {
        this._id = '_' + Math.random().toString(16);
        this._label = label;
        this._isEnabled = true;
    }

    public setEnabled(isEnabled: boolean) {
        this._isEnabled = isEnabled;
        this._onEnabledChanged();
    }

    public abstract generateHTML(): string;
    public abstract registerEvents(): void;

    protected abstract _onEnabledChanged(): void;
}
