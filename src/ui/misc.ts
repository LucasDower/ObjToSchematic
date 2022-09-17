import { OutputStyle } from './elements/output';

type TMessage = {
    groupId: string,
    body: string,
}

export class UIMessageBuilder {
    private _messages: TMessage[];

    public constructor() {
        this._messages = [];
    }

    public static create() {
        return new UIMessageBuilder();
    }

    public addHeading(groupId: string, message: string, style: OutputStyle) {
        this.addBold(groupId, [message + ':'], style);
        return this;
    }

    public addBold(groupId: string, messages: string[], style: OutputStyle) {
        for (const message of messages) {
            const cssColourClass = this._getStatusCSSClass(style);
            this._messages.push({
                groupId: groupId, body: `
                <div style="display: flex; align-items: center;" ${cssColourClass ? `class="${cssColourClass}"` : ''}>
                    <div style="margin-right: 8px;" class="loader-circle"></div>
                    <b>${message}</b>
                </div>
            `});
        }
        return this;
    }

    public addItem(groupId: string, messages: string[], style: OutputStyle) {
        for (const message of messages) {
            const cssColourClass = this._getStatusCSSClass(style);
            this._messages.push({
                groupId: groupId, body: `
                <div style="padding-left: 16px;" ${cssColourClass ? `class="${cssColourClass}"` : ''}> - ${message}</div>
            `});
        }
        return this;
    }

    public addTask(groupId: string, message: string) {
        this._messages.push({
            groupId: groupId, body: `
            <div style="display: flex; align-items: center; color: var(--text-standard)">
                <div style="margin-right: 8px;" class="loader-circle spin"></div> 
                <b class="spin">${message}</b>
            </div>
        `});
        return this;
    }

    public clear(groupId: string) {
        this._messages = this._messages.filter((x) => x.groupId !== groupId);
        return this;
    }

    public clearAll() {
        this._messages = [];
    }

    public toString(): string {
        // Put together in a flexbox
        const divs = this._messages
            .map((x) => x.body)
            .join('');

        return `
            <div style="display: flex; flex-direction: column">
                ${divs}
            </div>
        `;
    }

    public static fromString(groupId: string, string: string, style: OutputStyle): UIMessageBuilder {
        const builder = new UIMessageBuilder();
        builder.addItem(groupId, [string], style);
        return builder;
    }

    public join(builder: UIMessageBuilder) {
        this._messages.push(...builder._messages);
    }

    private _getStatusCSSClass(status?: OutputStyle) {
        switch (status) {
            case 'success':
                return 'status-success';
            case 'warning':
                return 'status-warning';
            case 'error':
                return 'status-error';
        }
    }
}
