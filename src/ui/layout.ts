import { BaseUIElement } from './elements/base';
import { SliderElement } from './elements/slider';
import { ComboBoxElement, ComboBoxItem } from './elements/combobox';
import { FileInputElement } from './elements/file_input';
import { ButtonElement } from './elements/button';
import { OutputElement } from './elements/output';
import { Action, AppContext } from '../app_context';
import { ASSERT, LOG } from '../util';

import fs from 'fs';
import path from 'path';
import { ToolbarItemElement } from './elements/toolbar_item';
import { EAppEvent } from '../event';
import { MeshType, Renderer } from '../renderer';
import { ArcballCamera } from '../camera';

export interface Group {
    label: string;
    elements: { [key: string]: BaseUIElement<any> };
    elementsOrder: string[];
    submitButton: ButtonElement;
    output: OutputElement;
    postElements?: { [key: string]: BaseUIElement<any> };
    postElementsOrder?: string[];
}

export interface ToolbarGroup {
    elements: { [key: string]: ToolbarItemElement };
    elementsOrder: string[];
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
                this._appContext.do(Action.Import);
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
                this._appContext.do(Action.Simplify);
            }),
            output: new OutputElement(),
        },
        'build': {
            label: 'Build',
            elements: {
                'height': new SliderElement('Desired height', 5, 320, 0, 80),
                'ambientOcclusion': new ComboBoxElement('Ambient occlusion', [
                    { id: 'on', displayText: 'On (recommended)' },
                    { id: 'off', displayText: 'Off (faster)' },
                ]),
                'multisampleColouring': new ComboBoxElement('Multisample colouring', [
                    { id: 'on', displayText: 'On (recommended)' },
                    { id: 'off', displayText: 'Off (faster)' },
                ]),
                'textureFiltering': new ComboBoxElement('Texture filtering', [
                    { id: 'linear', displayText: 'Linear (recommended)' },
                    { id: 'nearest', displayText: 'Nearest (faster)' },
                ]),
            },
            elementsOrder: ['height', 'ambientOcclusion', 'multisampleColouring', 'textureFiltering'],
            submitButton: new ButtonElement('Voxelise mesh', () => {
                this._appContext.do(Action.Voxelise);
            }),
            output: new OutputElement(),
        },
        'palette': {
            label: 'Palette',
            elements: {
                'textureAtlas': new ComboBoxElement('Texture atlas', this._getTextureAtlases()),
                'blockPalette': new ComboBoxElement('Block palette', this._getBlockPalettes()),
                'dithering': new ComboBoxElement('Dithering', [
                    { id: 'on', displayText: 'On (recommended)' },
                    { id: 'off', displayText: 'Off' },
                ]),
                'colourSpace': new ComboBoxElement('Colour space', [
                    { id: 'lab', displayText: 'LAB (recommended)' },
                    { id: 'rgb', displayText: 'RGB (faster)' },
                ]),
            },
            elementsOrder: ['textureAtlas', 'blockPalette', 'dithering', 'colourSpace'],
            submitButton: new ButtonElement('Assign blocks', () => {
                this._appContext.do(Action.Palette);
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
                this._appContext.do(Action.Export);
            }),
            output: new OutputElement(),
        },
    };

    private _toolbar = {
        groups: {
            'viewmode': {
                elements: {
                    'mesh': new ToolbarItemElement('mesh', () => {
                        Renderer.Get.setModelToUse(MeshType.TriangleMesh);
                    }, 
                    EAppEvent.onModelActiveChanged, (...args: any[]) => {
                        const modelUsed = args[0][0][0] as MeshType;
                        return modelUsed === MeshType.TriangleMesh;
                    },
                    EAppEvent.onModelAvailableChanged, (...args: any[]) => {
                        const modelType = args[0][0][0] as MeshType;
                        const isCached = args[0][0][1] as boolean;
                        return modelType >= MeshType.TriangleMesh && isCached;
                    }),
                    
                    'voxelMesh': new ToolbarItemElement('voxel', () => {
                        Renderer.Get.setModelToUse(MeshType.VoxelMesh);
                    }, EAppEvent.onModelActiveChanged, (...args: any[]) => {
                        const modelUsed = args[0][0][0] as MeshType;
                        return modelUsed === MeshType.VoxelMesh;
                    }, EAppEvent.onModelAvailableChanged, (...args: any[]) => {
                        const modelType = args[0][0][0] as MeshType;
                        const isCached = args[0][0][1] as boolean;
                        return modelType >= MeshType.VoxelMesh && isCached;
                    }),

                    'blockMesh': new ToolbarItemElement('block', () => {
                        Renderer.Get.setModelToUse(MeshType.BlockMesh);
                    }, EAppEvent.onModelActiveChanged, (...args: any[]) => {
                        const modelUsed = args[0][0][0] as MeshType;
                        return modelUsed === MeshType.BlockMesh;
                    }, EAppEvent.onModelAvailableChanged, (...args: any[]) => {
                        const modelType = args[0][0][0] as MeshType;
                        const isCached = args[0][0][1] as boolean;
                        return modelType >= MeshType.BlockMesh && isCached;
                    }),
                },
                elementsOrder: ['mesh', 'voxelMesh', 'blockMesh'],
            },
            'zoom': {
                elements: {
                    'zoomOut': new ToolbarItemElement('minus', () => {
                        ArcballCamera.Get.onZoomOut();
                    }),
                    'zoomIn': new ToolbarItemElement('plus', () => {
                        ArcballCamera.Get.onZoomIn();
                    }),
                },
                elementsOrder: ['zoomOut', 'zoomIn'],
            },
            /*
            'camera': {
                elements: {
                    'translate': new ToolbarItemElement('translate', () => {
                        // ArcballCamera.Get.onZoomOut();
                    }),
                    'rotate': new ToolbarItemElement('rotate', () => {
                        // ArcballCamera.Get.onZoomIn();
                    }),
                },
                elementsOrder: ['translate', 'rotate'],
            },
            */
            'debug': {
                elements: {
                    'grid': new ToolbarItemElement('grid', () => {
                        Renderer.Get.toggleIsGridEnabled();
                    }, EAppEvent.onGridEnabledChanged, (...args: any[]) => {
                        const isEnabled = args[0][0][0] as boolean;
                        return isEnabled;
                    }),
                    /*
                    'bounds': new ToolbarItemElement('bounds', () => {
                    }),
                    */
                },
                elementsOrder: ['grid'], // ['grid', 'bounds'],
            },
        },
        groupsOrder: ['viewmode', 'zoom', 'debug'],
    };

    private _uiDull: { [key: string]: Group } = this._ui;
    private _toolbarDull: { [key: string]: ToolbarGroup } = this._toolbar.groups;

    private _appContext: AppContext;

    constructor(appContext: AppContext) {
        this._appContext = appContext;
    }

    public build() {
        const groupHTML: { [key: string]: string } = {};
        for (const groupName in this._ui) {
            const group = this._uiDull[groupName];
            groupHTML[groupName] = `
            <div class="item item-body">
                <div class="prop-right">
                    <div class="h-div">
                    </div>
                </div>
                <div class="group-heading">
                    ${group.label.toUpperCase()}
                </div>
                <div class="prop-right">
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

        document.getElementById('properties')!.innerHTML = `<div class="container">
        ` + itemHTML + `</div>`;
        
        // Build toolbar
        let toolbarHTML = '';
        for (const toolbarGroupName of this._toolbar.groupsOrder) {
            toolbarHTML += '<div class="toolbar-group">';
            const toolbarGroup = this._toolbarDull[toolbarGroupName];
            for (const groupElementName of toolbarGroup.elementsOrder) {
                const groupElement = toolbarGroup.elements[groupElementName];
                toolbarHTML += groupElement.generateHTML();
            }
            toolbarHTML += '</div>';
        }

        document.getElementById('toolbar')!.innerHTML = toolbarHTML;
    }

    public cacheValues(action: Action) {
        const group = this._getActionGroup(action);
        for (const elementName of group.elementsOrder) {
            LOG(`Caching ${elementName}`);
            const element = group.elements[elementName];
            element.cacheValue();
        }
    }

    private _buildGroup(group: Group) {
        let groupHTML = '';
        for (const elementName of group.elementsOrder) {
            const element = group.elements[elementName];
            groupHTML += this._buildSubcomponent(element);
        }

        let postGroupHTML = '';
        if (group.postElements) {
            ASSERT(group.postElementsOrder, 'No post elements order');
            for (const elementName of group.postElementsOrder) {
                const element = group.postElements[elementName];
                postGroupHTML += this._buildSubcomponent(element);
            }
        }

        return `
            ${groupHTML}
            <div class="item item-body">
                <div class="prop-right">
                    ${group.submitButton.generateHTML()}
                </div>
            </div>
            <div class="item item-body">
                <div class="prop-right">
                    ${group.output.generateHTML()}
                </div>
            </div>
            ${postGroupHTML}
        `;
    }

    private _buildSubcomponent(element: BaseUIElement<any>) {
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
            if (group.postElements) {
                ASSERT(group.postElementsOrder);
                for (const elementName in group.postElements) {
                    const element = group.postElements[elementName];
                    element.registerEvents();
                }
            }
        }

        // Register toolbar
        for (const toolbarGroupName of this._toolbar.groupsOrder) {
            const toolbarGroup = this._toolbarDull[toolbarGroupName];
            for (const groupElementName of toolbarGroup.elementsOrder) {
                toolbarGroup.elements[groupElementName].registerEvents();
            }
        } 
    }

    public get layout() {
        return this._ui;
    }

    public get layoutDull() {
        return this._uiDull;
    }

    public get toolbar() {
        return this._toolbar;
    }

    public enable(action: Action) {
        LOG('enabling', action);

        // TODO: Remove once Simplify has been implemented
        if (action === Action.Simplify) {
            action = Action.Voxelise;
        }
        const group = this._getActionGroup(action);
        for (const compName in group.elements) {
            group.elements[compName].setEnabled(true);
        }
        group.submitButton.setEnabled(true);
        // Enable the post elements of the previous group
        const prevGroup = this._getActionGroup(action - 1);
        if (prevGroup && prevGroup.postElements) {
            ASSERT(prevGroup.postElementsOrder);
            for (const postElementName in prevGroup.postElements) {
                prevGroup.postElements[postElementName].setEnabled(true);
            }
        }
    }

    public disable(action: Action) {
        for (let i = action; i < Action.MAX; ++i) {
            const group = this._getActionGroup(i);
            LOG('disabling', group.label);
            for (const compName in group.elements) {
                group.elements[compName].setEnabled(false);
            }
            group.submitButton.setEnabled(false);
            group.output.clearMessage();
            if (group.postElements) {
                LOG(group.label, 'has post-element');
                ASSERT(group.postElementsOrder);
                for (const postElementName in group.postElements) {
                    LOG('disabling post-element', postElementName, 'for', group.label);
                    group.postElements[postElementName].setEnabled(false);
                }
            }
        }
        // Disable the post elements of the previous group
        const prevGroup = this._getActionGroup(action - 1);
        if (prevGroup && prevGroup.postElements) {
            ASSERT(prevGroup.postElementsOrder);
            for (const postElementName in prevGroup.postElements) {
                prevGroup.postElements[postElementName].setEnabled(false);
            }
        }
    }

    private _getActionGroup(action: Action): Group {
        const key = this.uiOrder[action];
        return this._uiDull[key];
    }

    private _getTextureAtlases(): ComboBoxItem[] {
        const textureAtlases: ComboBoxItem[] = [];
        const palettesDir = path.join(__dirname, '../../resources/atlases');

        fs.readdirSync(palettesDir).forEach((file) => {
            if (file.endsWith('.atlas')) {
                const paletteID = file.split('.')[0];
                let paletteName = paletteID.replace('-', ' ').toLowerCase();
                paletteName = paletteName.charAt(0).toUpperCase() + paletteName.slice(1);
                textureAtlases.push({ id: paletteID, displayText: paletteName });
            }
        });

        return textureAtlases;
    }

    private _getBlockPalettes(): ComboBoxItem[] {
        const blockPalettes: ComboBoxItem[] = [];
        const palettesDir = path.join(__dirname, '../../resources/palettes');

        fs.readdirSync(palettesDir).forEach((file) => {
            if (file.endsWith('.palette')) {
                const paletteID = file.split('.')[0];
                let paletteName = paletteID.replace('-', ' ').toLowerCase();
                paletteName = paletteName.charAt(0).toUpperCase() + paletteName.slice(1);
                blockPalettes.push({ id: paletteID, displayText: paletteName });
            }
        });

        return blockPalettes;
    }
}
