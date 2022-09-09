export class UIMessageBuilder {
    private _messages: string[];
    
    public constructor() {
        this._messages = [];
    }

    public static create() {
        return new UIMessageBuilder();
    }

    public addHeading(message: string) {
        this.addBold(message + ':');
        return this;
    }

    public addBold(...messages: string[]) {
        for (const message of messages) {
            this._messages.push(`<b>${message}</b>`);
        }
        return this;
    }

    public add(...messages: string[]) {
        for (const message of messages) {
            this._messages.push(message);
        }
        return this;
    }

    public addItem(...messages: string[]) {
        for (const message of messages) {
            this._messages.push('• ' + message);
        }
        return this;
    }

    public toString(): string {
        return this._messages.join('<br>');
    }

    public static fromString(string: string): UIMessageBuilder {
        const builder = new UIMessageBuilder();
        builder.addItem(string);
        return builder;
    }

    public join(builder: UIMessageBuilder) {
        this._messages.push(...builder._messages);
    }
}
