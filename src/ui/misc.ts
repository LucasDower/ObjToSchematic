import { ASSERT } from '../util/error_util';

export class HTMLBuilder {
    private _html: string;

    public constructor() {
        this._html = '';
    }

    public add(html: string) {
        this._html += html;
        return this;
    }

    public toString() {
        return this._html;
    }

    public placeInto(elementId: string) {
        const element = document.getElementById(elementId);
        ASSERT(element !== null, `Could not place HTML into element with id '${elementId}'`);
        element.innerHTML = this._html;
    }
}

export namespace MiscComponents {
    export function createGroupHeader(label: string) {
        return `
            <div class="container-group-heading">
                <div class="group-heading">
                    ${label}
                </div>
            </div>
        `;
    }
}
