import { ConfigUIElement } from './config_element';

/**
 * A `FullConfigUIElement` is a UI element that has a value the user can change.
 * For example, sliders, comboboxes and checkboxes are `ConfigUIElement`.
 */
export abstract class FullConfigUIElement<T, F> extends ConfigUIElement<T, F> {
    public override generateHTML() {
        return `
            <div class="property full-width-property" style="flex-direction: column; align-items: start;">
                <div class="prop-key-container" id="${this._getLabelId()}">
                    ${this._label}
                </div>
                ${this._generateInnerHTML()}
            </div>
        `;
    }
}
