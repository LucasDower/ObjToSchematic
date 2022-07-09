export class UIMessageBuilder {
    private _messages: string[];
    
    public constructor() {
        this._messages = [];
    }

    public addHeading(message: string) {
        this.addBold(message + ':');
    }

    public addBold(...messages: string[]) {
        for (const message of messages) {
            this._messages.push(`<b>${message}</b>`);
        }
    }

    public add(...messages: string[]) {
        for (const message of messages) {
            this._messages.push(message);
        }
    }

    public addItem(...messages: string[]) {
        for (const message of messages) {
            this._messages.push('• ' + message);
        }
    }

    public toString(): string {
        return this._messages.join('<br>');
    }
}
