import { BaseUIElement } from './elements/base';
import { SliderElement } from './elements/slider';
import { ComboBoxElement } from './elements/combobox';
import { FileInputElement } from './elements/file_input';
import { ButtonElement } from './elements/button';
import { OutputElement } from './elements/output';
import { Action, ActionReturnType, AppContext } from '../app_context';

export interface Group {
    label: string;
    elements: { [key: string]: BaseUIElement };
    elementsOrder: string[];
    submitButton: ButtonElement;
    output: OutputElement;
}
export class UI {
    public uiOrder = ['import', 'simplify', 'build', 'palette', 'export'];
    private _ui = {
        'import': {
            label: 'Import',
            elements: {
                'input': new FileInputElement('Wavefront .obj file', 'obj'),
            },
            elementsOrder: ['input'],
            submitButton: new ButtonElement('Load mesh', () => {
                AppContext.Get.do(Action.Import);
            }),
            output: new OutputElement(),
        },
        'simplify': {
            label: 'Simplify',
            elements: {
                'ratio': new SliderElement('Ratio', 0.0, 1.0, 2, 0.5),
            },
            elementsOrder: ['ratio'],
            submitButton: new ButtonElement('Simplify mesh', () => {
                AppContext.Get.do(Action.Simplify);
            }),
            output: new OutputElement(),
        },
        'build': {
            label: 'Build',
            elements: {
                'height': new SliderElement('Desired height', 1, 320, 0, 80),
                'ambientOcclusion': new ComboBoxElement('Ambient occlusion', [
                    { id: 'on', displayText: 'On (recommended)' },
                    { id: 'off', displayText: 'Off (faster)' },
                ]),
                'multisampleColouring': new ComboBoxElement('Multisample Colouring', [
                    { id: 'on', displayText: 'On (recommended)' },
                    { id: 'off', displayText: 'Off (faster)' },
                ]),
            },
            elementsOrder: ['height', 'ambientOcclusion', 'multisampleColouring'],
            submitButton: new ButtonElement('Voxelise mesh', () => {
                AppContext.Get.do(Action.Voxelise);
            }),
            output: new OutputElement(),
        },
        'palette': {
            label: 'Palette',
            elements: {
                'blockPalette': new ComboBoxElement('Block palette', [
                    { id: 'default', displayText: 'Default' },
                ]),
                'choiceMethod': new ComboBoxElement('Choice method', [
                    { id: 'euclidian', displayText: 'Euclidian distance' },
                ]),
                'dithering': new ComboBoxElement('Dithering', [
                    { id: 'on', displayText: 'On (recommended)' },
                    { id: 'off', displayText: 'Off' },
                ]),
            },
            elementsOrder: ['blockPalette', 'choiceMethod', 'dithering'],
            submitButton: new ButtonElement('Assign blocks', () => {
                AppContext.Get.do(Action.Palette);
            }),
            output: new OutputElement(),
        },
        'export': {
            label: 'Export',
            elements: {
                'export': new ComboBoxElement('File format', [
                    { id: 'litematic', displayText: 'Litematic' },
                    { id: 'schematic', displayText: 'Schematic' },
                ]),
            },
            elementsOrder: ['export'],
            submitButton: new ButtonElement('Export structure', () => {
                AppContext.Get.do(Action.Export);
            }),
            output: new OutputElement(),
        },
    };
    private _uiDull: { [key: string]: Group } = this._ui;

    private static _instance: UI;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    constructor() {

    }

    public build() {
        const groupHTML: { [key: string]: string } = {};
        for (const groupName in this._ui) {
            const group = this._uiDull[groupName];
            groupHTML[groupName] = `
            <div class="item item-body">
                <div class="sub-right">
                    <div class="h-div">
                    </div>
                </div>
                <div class="sub-left-alt">
                    ${group.label.toUpperCase()}
                </div>
                <div class="sub-right">
                    <div class="h-div">
                    </div>
                </div>
            </div>
            `;
            groupHTML[groupName] += this._buildGroup(group);
        }

        let itemHTML = '';
        for (const groupName of this.uiOrder) {
            itemHTML += groupHTML[groupName];
        }

        document.getElementById('properties')!.innerHTML = `<div class="menu"><div class="container">
        ` + itemHTML + `</div></div>`;
    }

    private _buildGroup(group: Group) {
        let groupHTML = '';
        for (const elementName of group.elementsOrder) {
            const element = group.elements[elementName];
            groupHTML += this._buildSubcomponent(element);
        }

        return `
            ${groupHTML}
            <div class="item item-body">
                <div class="sub-right">
                    ${group.submitButton.generateHTML()}
                </div>
            </div>
            <div class="item item-body">
                <div class="sub-right">
                    ${group.output.generateHTML()}
                </div>
            </div>
        `;
    }

    private _buildSubcomponent(element: BaseUIElement) {
        return `
            <div class="item item-body">
                ${element.generateHTML()}
            </div>
        `;
    }

    public registerEvents() {
        for (const groupName in this._ui) {
            const group = this._uiDull[groupName];
            for (const elementName in group.elements) {
                const element = group.elements[elementName];
                element.registerEvents();
            }
            group.submitButton.registerEvents();
        }
    }

    public get layout() {
        return this._ui;
    }

    public get layoutDull() {
        return this._uiDull;
    }

    public disable(action: Action) {
        for (let i = action; i < Action.MAX; ++i) {
            const key = this.uiOrder[i];
            this._setGroupEnabled(this._uiDull[key], false);
        }
    }

    public enable(action: Action) {
        if (action === Action.Simplify) {
            action = Action.Voxelise;
        }
        const key = this.uiOrder[action];
        this._setGroupEnabled(this._uiDull[key], true);
    }

    private _setGroupEnabled(group: Group, isEnabled: boolean) {
        for (const compName in group.elements) {
            const comp = group.elements[compName];
            comp.setEnabled(isEnabled);
        }
        group.submitButton.setEnabled(isEnabled);
        if (!isEnabled) {
            group.output.clearMessage();
        }
    }
}
