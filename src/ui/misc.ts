import { OutputStyle } from './elements/output';

type TMessage = {
    groupId: string,
    body: string,
}

interface IUIOutputElement {
    buildHTML(): string;
}

export class UITreeBuilder implements IUIOutputElement {
    private _rootLabel: string;
    private _children: Array<{ html: string, warning: boolean } | UITreeBuilder>;
    private _postBuildDelegates: Array<() => void>;
    private _warning: boolean;
    private _open: boolean;

    private constructor(rootLabel: string) {
        this._rootLabel = rootLabel;
        this._children = [];
        this._postBuildDelegates = [];
        this._warning = false;
        this._open = false;
    }

    public static create(rootLabel: string): UITreeBuilder {
        return new UITreeBuilder(rootLabel);
    }

    public isOpen() {
        return this._open;
    }

    public toggleIsOpen() {
        this._open = !this._open;
    }

    public setWarning() {
        this._warning = true;
    }

    public getWarning() {
        if (this._warning) {
            return true;
        }

        for (const child of this._children) {
            if (child instanceof UITreeBuilder) {
                if (child.getWarning()) {
                    return true;
                }
            } else {
                if (child.warning) {
                    return true;
                }
            }
        }

        return false;
    }

    public addChild(child: { html: string, warning: boolean } | UITreeBuilder, postBuildDelegate?: () => void) {
        this._children.push(child);
        if (postBuildDelegate !== undefined) {
            this._postBuildDelegates.push(postBuildDelegate);
        }
        if (child instanceof UITreeBuilder) {
            this._postBuildDelegates.push(() => { child.postBuild(); });
        }
    }

    public postBuild() {
        this._postBuildDelegates.forEach((delegate) => {
            delegate();
        });

        const toggler = document.getElementsByClassName('caret') as HTMLCollectionOf<HTMLElement>;

        for (let i = 0; i < toggler.length; i++) {
            const temp = toggler[i];
            temp.onclick = () => {
                temp.parentElement?.querySelector('.nested')?.classList.toggle('active');
                temp.classList.toggle('caret-down');
            };
        }
    }

    public buildHTML(): string {
        let childrenHTML: string = '';
        this._children.forEach((child) => {
            childrenHTML += '<li>';
            if (child instanceof UITreeBuilder) {
                childrenHTML += child.buildHTML();
            } else {
                childrenHTML += child.warning ? `<p style="margin:0px; color:orange;">${child.html}</p>` : child.html;
            }
            childrenHTML += '</li>';
        });

        if (this.getWarning()) {
            return `
                <span class="caret caret-down" style="color:orange;" >${this._rootLabel}</span>
                <ul class="nested active">${childrenHTML}</ul>
            `;
        } else if (this.isOpen()) {
            return `
                <span class="caret caret-down">${this._rootLabel}</span>
                <ul class="nested active">${childrenHTML}</ul>
            `;
        } else {
            return `
                <span class="caret">${this._rootLabel}</span>
                <ul class="nested">${childrenHTML}</ul>
            `;
        }
    }
}

export class UIMessageBuilder {
    private _messages: TMessage[];
    private _postBuildDelegates: Array<() => void>;

    public constructor() {
        this._messages = [];
        this._postBuildDelegates = [];
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

    public addTree(groupId: string, tree: UITreeBuilder) {
        this._messages.push({
            groupId: groupId,
            body: `<div style="padding-left: 16px;">${tree.buildHTML()}</div>`,
        });
        this._postBuildDelegates.push(() => { tree.postBuild(); });
    }

    public setTree(groupId: string, tree: UITreeBuilder) {
        let found = false;
        this._messages.forEach((message) => {
            if (message.groupId === groupId) {
                this._postBuildDelegates = []; // TODO: Fix
                message.body = `<div style="padding-left: 16px;">${tree.buildHTML()}</div>`;
                this._postBuildDelegates.push(() => { tree.postBuild(); });
                found = true;
            }
            return;
        });

        if (!found) {
            this.addTree(groupId, tree);
        }
    }

    public postBuild() {
        this._postBuildDelegates.forEach((delegate) => {
            delegate();
        });
    }

    public addItem(groupId: string, messages: string[], style: OutputStyle, indent: number = 1) {
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
