import { ConfigComponent } from './config';

/**
 * A `FullConfigComponent` is a UI element that has a value the user can change.
 * For example, sliders, comboboxes and checkboxes are `ConfigComponent`.
 */
export abstract class FullConfigComponent<T, F> extends ConfigComponent<T, F> {
    public override generateHTML() {
        return `
            <div class="property" style="flex-direction: column; align-items: start;">
                <div class="prop-key-container" id="${this._getLabelId()}">
                    ${this._label}
                </div>
                ${this._generateInnerHTML()}
            </div>
        `;
    }
}
