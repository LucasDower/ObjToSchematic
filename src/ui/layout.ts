import fs from 'fs';

import { AppContext } from '../app_context';
import { TBlockAssigners } from '../assigners/assigners';
import { ArcballCamera } from '../camera';
import { TExporters } from '../exporters/exporters';
import { PaletteManager } from '../palette';
import { MeshType, Renderer } from '../renderer';
import { EAction } from '../util';
import { ASSERT } from '../util/error_util';
import { LOG } from '../util/log_util';
import { AppPaths } from '../util/path_util';
import { TVoxelOverlapRule } from '../voxel_mesh';
import { TVoxelisers } from '../voxelisers/voxelisers';
import { BaseUIElement } from './elements/base';
import { ButtonElement } from './elements/button';
import { ComboBoxElement, ComboBoxItem } from './elements/combobox';
import { FileInputElement } from './elements/file_input';
import { OutputElement } from './elements/output';
import { SliderElement } from './elements/slider';
import { ToolbarItemElement } from './elements/toolbar_item';

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
    public uiOrder = ['import', 'voxelise', 'assign', 'export'];
    private _ui = {
        'import': {
            label: 'Import',
            elements: {
                'input': new FileInputElement('Wavefront .obj file', 'obj'),
            },
            elementsOrder: ['input'],
            submitButton: new ButtonElement('Load mesh', () => {
                this._appContext.do(EAction.Import);
            }),
            output: new OutputElement(),
        },
        'voxelise': {
            label: 'Voxelise',
            elements: {
                'desiredHeight': new SliderElement('Desired height', 3, 380, 0, 80, 1),
                'voxeliser': new ComboBoxElement<TVoxelisers>('Algorithm', [
                    {
                        id: 'bvh-ray',
                        displayText: 'BVH Ray-based',
                    },
                    {
                        id: 'bvh-ray-plus-thickness',
                        displayText: 'BVH Ray-based (thicker walls)',
                    },
                    {
                        id: 'ncrb',
                        displayText: 'NCRB',
                    },
                    {
                        id: 'ray-based',
                        displayText: 'Ray-based (legacy)',
                    },
                ]),
                'ambientOcclusion': new ComboBoxElement('Ambient occlusion', [
                    {
                        id: 'on',
                        displayText: 'On (recommended)',
                    },
                    {
                        id: 'off',
                        displayText: 'Off (faster)',
                    },
                ]),
                'multisampleColouring': new ComboBoxElement('Multisampling', [
                    {
                        id: 'on',
                        displayText: 'On (recommended)',
                    },
                    {
                        id: 'off',
                        displayText: 'Off (faster)',
                    },
                ]),
                'textureFiltering': new ComboBoxElement('Texture filtering', [
                    {
                        id: 'linear',
                        displayText: 'Linear (recommended)',
                    },
                    {
                        id: 'nearest',
                        displayText: 'Nearest (faster)',
                    },
                ]),
                'voxelOverlapRule': new ComboBoxElement<TVoxelOverlapRule>('Voxel overlap', [
                    {
                        id: 'average',
                        displayText: 'Average (recommended)',
                        tooltip: 'If multiple voxels are placed in the same location, take the average of their colours',
                    },
                    {
                        id: 'first',
                        displayText: 'First',
                        tooltip: 'If multiple voxels are placed in the same location, use the first voxel\'s colour',
                    },
                ]),
            },
            elementsOrder: ['desiredHeight', 'voxeliser', 'ambientOcclusion', 'multisampleColouring', 'textureFiltering', 'voxelOverlapRule'],
            submitButton: new ButtonElement('Voxelise mesh', () => {
                this._appContext.do(EAction.Voxelise);
            }),
            output: new OutputElement(),
        },
        'assign': {
            label: 'Assign',
            elements: {
                'textureAtlas': new ComboBoxElement('Texture atlas', this._getTextureAtlases()),
                'blockPalette': new ComboBoxElement('Block palette', this._getBlockPalettes()),
                'dithering': new ComboBoxElement<TBlockAssigners>('Dithering', [
                    { id: 'ordered-dithering', displayText: 'Ordered' },
                    { id: 'random-dithering', displayText: 'Random' },
                    { id: 'basic', displayText: 'Off' },
                ]),
                'fallable': new ComboBoxElement('Fallable blocks', [
                    {
                        id: 'replace-falling',
                        displayText: 'Replace falling with solid',
                        tooltip: 'Replace all blocks that can fall with solid blocks',
                    },
                    {
                        id: 'replace-fallable',
                        displayText: 'Replace fallable with solid',
                        tooltip: 'Replace all blocks that will fall with solid blocks',
                    },
                    /*
                    {
                        id: 'place-string',
                        displayText: 'Place string under',
                        tooltip: 'Place string blocks under all blocks that would fall otherwise',
                    },
                    */
                    {
                        id: 'do-nothing',
                        displayText: 'Do nothing',
                        tooltip: 'Let the block fall',
                    },
                ]),
                'colourAccuracy': new SliderElement('Colour accuracy', 1, 8, 1, 5, 0.1),
            },
            elementsOrder: ['textureAtlas', 'blockPalette', 'dithering', 'fallable', 'colourAccuracy'],
            submitButton: new ButtonElement('Assign blocks', () => {
                this._appContext.do(EAction.Assign);
            }),
            output: new OutputElement(),
        },
        'export': {
            label: 'Export',
            elements: {
                'export': new ComboBoxElement<TExporters>('File format', [
                    { id: 'litematic', displayText: 'Litematic (.litematic)' },
                    { id: 'schematic', displayText: 'Schematic (.schematic)' },
                    { id: 'obj', displayText: 'Wavefront OBJ (.obj)' },
                    { id: 'schem', displayText: 'Sponge Schematic (.schem)' },
                    { id: 'nbt', displayText: 'Structure blocks (.nbt)' },
                ]),
            },
            elementsOrder: ['export'],
            submitButton: new ButtonElement('Export structure', () => {
                this._appContext.do(EAction.Export);
            }),
            output: new OutputElement(),
        },
    };

    private _toolbarLeft = {
        groups: {
            'viewmode': {
                elements: {
                    'mesh': new ToolbarItemElement({ icon: 'mesh' })
                        .onClick(() => {
                            Renderer.Get.setModelToUse(MeshType.TriangleMesh);
                        })
                        .isActive(() => {
                            return Renderer.Get.getActiveMeshType() === MeshType.TriangleMesh;
                        })
                        .isEnabled(() => {
                            return Renderer.Get.getModelsAvailable() >= MeshType.TriangleMesh;
                        }),
                    'voxelMesh': new ToolbarItemElement({ icon: 'voxel' })
                        .onClick(() => {
                            Renderer.Get.setModelToUse(MeshType.VoxelMesh);
                        })
                        .isActive(() => {
                            return Renderer.Get.getActiveMeshType() === MeshType.VoxelMesh;
                        })
                        .isEnabled(() => {
                            return Renderer.Get.getModelsAvailable() >= MeshType.VoxelMesh;
                        }),
                    'blockMesh': new ToolbarItemElement({ icon: 'block' })
                        .onClick(() => {
                            Renderer.Get.setModelToUse(MeshType.BlockMesh);
                        })
                        .isActive(() => {
                            return Renderer.Get.getActiveMeshType() === MeshType.BlockMesh;
                        })
                        .isEnabled(() => {
                            return Renderer.Get.getModelsAvailable() >= MeshType.BlockMesh;
                        }),
                },
                elementsOrder: ['mesh', 'voxelMesh', 'blockMesh'],
            },
            'debug': {
                elements: {
                    'grid': new ToolbarItemElement({ icon: 'grid' })
                        .onClick(() => {
                            Renderer.Get.toggleIsGridEnabled();
                        })
                        .isActive(() => {
                            return Renderer.Get.isGridEnabled();
                        })
                        .isEnabled(() => {
                            return Renderer.Get.getActiveMeshType() !== MeshType.None;
                        }),
                    'axes': new ToolbarItemElement({ icon: 'axes' })
                        .onClick(() => {
                            Renderer.Get.toggleIsAxesEnabled();
                        })
                        .isActive(() => {
                            return Renderer.Get.isAxesEnabled();
                        }),
                },
                elementsOrder: ['grid', 'axes'],
            },

        },
        groupsOrder: ['viewmode', 'debug'],
    };

    private _toolbarRight = {
        groups: {
            'zoom': {
                elements: {
                    'zoomOut': new ToolbarItemElement({ icon: 'minus' })
                        .onClick(() => {
                            ArcballCamera.Get.onZoomOut();
                        }),
                    'zoomIn': new ToolbarItemElement({ icon: 'plus' })
                        .onClick(() => {
                            ArcballCamera.Get.onZoomIn();
                        }),
                    'reset': new ToolbarItemElement({ icon: 'centre' })
                        .onClick(() => {
                            ArcballCamera.Get.reset();
                        }),
                },
                elementsOrder: ['zoomOut', 'zoomIn', 'reset'],
            },
            'camera': {
                elements: {
                    'perspective': new ToolbarItemElement({ icon: 'perspective' })
                        .onClick(() => {
                            ArcballCamera.Get.setCameraMode('perspective');
                        })
                        .isActive(() => {
                            return ArcballCamera.Get.isPerspective();
                        }),
                    'orthographic': new ToolbarItemElement({ icon: 'orthographic' })
                        .onClick(() => {
                            ArcballCamera.Get.setCameraMode('orthographic');
                        })
                        .isActive(() => {
                            return ArcballCamera.Get.isOrthographic();
                        }),
                    'angleSnap': new ToolbarItemElement({ icon: 'magnet' })
                        .onClick(() => {
                            ArcballCamera.Get.toggleAngleSnap();
                        })
                        .isActive(() => {
                            return ArcballCamera.Get.isAngleSnapEnabled();
                        })
                        .isEnabled(() => {
                            return ArcballCamera.Get.isOrthographic();
                        }),

                },
                elementsOrder: ['perspective', 'orthographic', 'angleSnap'],
            },
        },
        groupsOrder: ['camera', 'zoom'],
    };

    private _uiDull: { [key: string]: Group } = this._ui;
    private _toolbarLeftDull: { [key: string]: ToolbarGroup } = this._toolbarLeft.groups;
    private _toolbarRightDull: { [key: string]: ToolbarGroup } = this._toolbarRight.groups;

    private _appContext: AppContext;

    constructor(appContext: AppContext) {
        this._appContext = appContext;

        this._ui.assign.elements.textureAtlas.addDescription('Textures to use and colour-match with');
        this._ui.assign.elements.fallable.addDescription('Read tooltips for more info');
    }

    public tick() {
        for (const groupName in this._toolbarLeftDull) {
            const toolbarGroup = this._toolbarLeftDull[groupName];
            for (const toolbarItem of toolbarGroup.elementsOrder) {
                toolbarGroup.elements[toolbarItem].tick();
            }
        }

        for (const groupName in this._toolbarRightDull) {
            const toolbarGroup = this._toolbarRightDull[groupName];
            for (const toolbarItem of toolbarGroup.elementsOrder) {
                toolbarGroup.elements[toolbarItem].tick();
            }
        }
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
        // Left
        toolbarHTML += '<div class="toolbar-column">';
        for (const toolbarGroupName of this._toolbarLeft.groupsOrder) {
            toolbarHTML += '<div class="toolbar-group">';
            const toolbarGroup = this._toolbarLeftDull[toolbarGroupName];
            for (const groupElementName of toolbarGroup.elementsOrder) {
                const groupElement = toolbarGroup.elements[groupElementName];
                toolbarHTML += groupElement.generateHTML();
            }
            toolbarHTML += '</div>';
        }
        toolbarHTML += '</div>';
        // Right
        toolbarHTML += '<div class="toolbar-column">';
        for (const toolbarGroupName of this._toolbarRight.groupsOrder) {
            toolbarHTML += '<div class="toolbar-group">';
            const toolbarGroup = this._toolbarRightDull[toolbarGroupName];
            for (const groupElementName of toolbarGroup.elementsOrder) {
                const groupElement = toolbarGroup.elements[groupElementName];
                toolbarHTML += groupElement.generateHTML();
            }
            toolbarHTML += '</div>';
        }
        toolbarHTML += '</div>';

        document.getElementById('toolbar')!.innerHTML = toolbarHTML;
    }

    public cacheValues(action: EAction) {
        const group = this._getEActionGroup(action);
        for (const elementName of group.elementsOrder) {
            LOG(`[UI]: Caching ${elementName}`);
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

    public getActionOutput(action: EAction) {
        const group = this._getEActionGroup(action);
        return group.output;
    }

    public getActionButton(action: EAction) {
        const group = this._getEActionGroup(action);
        return group.submitButton;
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

        // Register toolbar left
        for (const toolbarGroupName of this._toolbarLeft.groupsOrder) {
            const toolbarGroup = this._toolbarLeftDull[toolbarGroupName];
            for (const groupElementName of toolbarGroup.elementsOrder) {
                toolbarGroup.elements[groupElementName].registerEvents();
            }
        }
        // Register toolbar right
        for (const toolbarGroupName of this._toolbarRight.groupsOrder) {
            const toolbarGroup = this._toolbarRightDull[toolbarGroupName];
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

    public enableTo(action: EAction) {
        for (let i = 0; i <= action; ++i) {
            this.enable(i);
        }
    }

    public enable(action: EAction) {
        if (action >= EAction.MAX) {
            return;
        }

        LOG('[UI]: Enabling', action);
        const group = this._getEActionGroup(action);
        for (const compName in group.elements) {
            group.elements[compName].setEnabled(true);
        }
        group.submitButton.setEnabled(true);
        // Enable the post elements of the previous group
        const prevGroup = this._getEActionGroup(action - 1);
        if (prevGroup && prevGroup.postElements) {
            ASSERT(prevGroup.postElementsOrder);
            for (const postElementName in prevGroup.postElements) {
                prevGroup.postElements[postElementName].setEnabled(true);
            }
        }
    }

    public disableAll() {
        this.disable(EAction.Import, false);
    }

    public disable(action: EAction, clearOutput: boolean = true) {
        if (action < 0) {
            return;
        }

        for (let i = action; i < EAction.MAX; ++i) {
            const group = this._getEActionGroup(i);
            //LOG('[UI]: Disabling', group.label);
            for (const compName in group.elements) {
                group.elements[compName].setEnabled(false);
            }
            group.submitButton.setEnabled(false);
            if (clearOutput) {
                group.output.getMessage().clearAll();
                group.output.updateMessage();
            }
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
        const prevGroup = this._getEActionGroup(action - 1);
        if (prevGroup && prevGroup.postElements) {
            ASSERT(prevGroup.postElementsOrder);
            for (const postElementName in prevGroup.postElements) {
                prevGroup.postElements[postElementName].setEnabled(false);
            }
        }
    }

    private _getEActionGroup(action: EAction): Group {
        const key = this.uiOrder[action];
        return this._uiDull[key];
    }

    private _getTextureAtlases(): ComboBoxItem<string>[] {
        const textureAtlases: ComboBoxItem<string>[] = [];

        fs.readdirSync(AppPaths.Get.atlases).forEach((file) => {
            if (file.endsWith('.atlas')) {
                const paletteID = file.split('.')[0];
                let paletteName = paletteID.replace('-', ' ').toLowerCase();
                paletteName = paletteName.charAt(0).toUpperCase() + paletteName.slice(1);
                textureAtlases.push({ id: paletteID, displayText: paletteName });
            }
        });

        return textureAtlases;
    }

    private _getBlockPalettes(): ComboBoxItem<string>[] {
        const blockPalettes: ComboBoxItem<string>[] = [];

        const palettes = PaletteManager.getPalettesInfo();
        for (const palette of palettes) {
            blockPalettes.push({
                id: palette.paletteID,
                displayText: palette.paletteDisplayName,
            });
        }

        return blockPalettes;
    }
}
