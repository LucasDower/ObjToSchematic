import { BaseUIElement } from "../layout";
import { assert } from "../../util";

export class ButtonElement extends BaseUIElement {
    private _label: string;
    private _onClick: () => void

    public constructor(id: string, label: string, onClick: () => void) {
        super(id);
        this._label = label;
        this._onClick = onClick;
        this._isEnabled = true;
    }

    public generateHTML() {
        return `
            <div class="button" id="${this._id}">
                ${this._label}
            </div>
        `;
    }

    public registerEvents(): void {
        const element = document.getElementById(this._id) as HTMLDivElement;
        assert(element !== null);

        element.addEventListener("click", () => {
            if (this._isEnabled) {
                this._onClick()
            }
        });
    }

    protected _onEnabledChanged() {
        const element = document.getElementById(this._id) as HTMLDivElement;
        assert(element !== null);

        if (this._isEnabled) {
            //element.classList.add("button");
            element.classList.remove("button-disabled");
        } else {
            element.classList.add("button-disabled");
            //element.classList.remove("button");
        }
    }
}