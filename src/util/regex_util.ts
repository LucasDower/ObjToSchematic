/** Regex for non-zero whitespace */
export const REGEX_NZ_WS = /[ \t]+/;

/** Regex for number */
export const REGEX_NUMBER = /[0-9eE+\.\-]+/;

export const REGEX_NZ_ANY = /.+/;

export function regexCapture(identifier: string, regex: RegExp) {
    return new RegExp(`(?<${identifier}>${regex.source}`);
}

export function regexOptional(regex: RegExp) {
    return new RegExp(`(${regex})?`);
}

export function buildRegex(...args: (string | RegExp)[]) {
    return new RegExp(args.map((r) => {
        if (r instanceof RegExp) {
            return r.source;
        }
        return r;
    }).join(''));
}

export class RegExpBuilder {
    private _components: string[];

    public constructor() {
        this._components = [];
    }

    public add(item: string | RegExp, capture?: string, optional: boolean = false): RegExpBuilder {
        let regex: string;
        if (item instanceof RegExp) {
            regex = item.source;
        } else {
            regex = item;
        }
        if (capture) {
            regex = `(?<${capture}>${regex})`;
        }
        if (optional) {
            regex = `(${regex})?`;
        }
        this._components.push(regex);
        return this;
    }

    public addMany(items: (string | RegExp)[], optional: boolean = false): RegExpBuilder {
        let toAdd: string = '';
        for (const item of items) {
            if (item instanceof RegExp) {
                toAdd += item.source;
            } else {
                toAdd += item;
            }
        }
        this._components.push(optional ? `(${toAdd})?` : toAdd);
        return this;
    }

    public addNonzeroWhitespace(): RegExpBuilder {
        this.add(REGEX_NZ_WS);
        return this;
    }

    public toRegExp(): RegExp {
        return new RegExp(this._components.join(''));
    }
}
