import fs from 'fs';

import { AppContext } from '../app_context';
import { TBlockAssigners } from '../assigners/assigners';
import { TFallableBehaviour } from '../block_mesh';
import { ArcballCamera } from '../camera';
import { TExporters } from '../exporters/exporters';
import { LOC } from '../localise';
import { PaletteManager } from '../palette';
import { MeshType, Renderer } from '../renderer';
import { EAction } from '../util';
import { ASSERT } from '../util/error_util';
import { LOG } from '../util/log_util';
import { AppPaths } from '../util/path_util';
import { TLocString, TTextureFiltering, TToggle } from '../util/type_util';
import { TVoxelOverlapRule } from '../voxel_mesh';
import { TVoxelisers } from '../voxelisers/voxelisers';
import { BaseUIElement } from './elements/base_element';
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
                'input': new FileInputElement()
                    .setFileExtensions(['obj'])
                    .setLabel(LOC.t('common.obj_file')),
            },
            elementsOrder: ['input'],
            submitButton: new ButtonElement()
                .setOnClick(() => {
                    this._appContext.do(EAction.Import);
                })
                .setLabel(LOC.t('common.load_mesh')),
            output: new OutputElement(),
        },
        'voxelise': {
            label: 'Voxelise',
            elements: {
                'desiredHeight': new SliderElement()
                    .setMin(3)
                    .setMax(380)
                    .setDefaultValue(80)
                    .setDecimals(0)
                    .setStep(1)
                    .setLabel(LOC.t('common.height')),
                'voxeliser': new ComboBoxElement<TVoxelisers>()
                    .addItems([{
                        displayText: LOC.t('common.bounding_volume_hierarchy_ray_based'),
                        payload: 'bvh-ray',
                    },
                    {
                        displayText: LOC.t('common.normal_corrected_ray_based'),
                        payload: 'ncrb',
                    },
                    {
                        displayText: LOC.t('common.ray_based'),
                        payload: 'ray-based',
                    }])
                    .setLabel(LOC.t('common.algorithm')),
                'ambientOcclusion': new ComboBoxElement<TToggle>()
                    .addItems([{
                        displayText: LOC.t('common.on_recommended'),
                        payload: 'on',
                    },
                    {
                        displayText: LOC.t('common.off_faster'),
                        payload: 'off',
                    }])
                    .setLabel(LOC.t('common.ambient_occlusion')),
                'multisampleColouring': new ComboBoxElement<TToggle>()
                    .addItems([{
                        displayText: LOC.t('common.on_recommended'),
                        payload: 'on',
                    },
                    {
                        displayText: LOC.t('common.off_faster'),
                        payload: 'off',
                    }])
                    .setLabel(LOC.t('common.multisampling')),
                'textureFiltering': new ComboBoxElement<TTextureFiltering>()
                    .addItems([{
                        displayText: LOC.t('common.linear_recommended'),
                        payload: 'linear',
                    },
                    {
                        displayText: LOC.t('common.nearest_faster'),
                        payload: 'nearest',
                    }])
                    .setLabel(LOC.t('common.texture_filtering')),
                'voxelOverlapRule': new ComboBoxElement<TVoxelOverlapRule>()
                    .addItems([{
                        displayText: LOC.t('common.average_recommended'),
                        payload: 'average',
                        tooltip: 'If multiple voxels are placed in the same location, take the average of their colours',
                    },
                    {
                        displayText: LOC.t('common.first'),
                        payload: 'first',
                        tooltip: 'If multiple voxels are placed in the same location, use the first voxel\'s colour',
                    }])
                    .setLabel(LOC.t('common.voxel_overlap_rule')),
            },
            elementsOrder: [
                'desiredHeight',
                'voxeliser',
                'ambientOcclusion',
                'multisampleColouring',
                'textureFiltering',
                'voxelOverlapRule',
            ],
            submitButton: new ButtonElement()
                .setOnClick(() => {
                    this._appContext.do(EAction.Voxelise);
                })
                .setLabel(LOC.t('common.voxelise_mesh')),
            output: new OutputElement(),
        },
        'assign': {
            label: 'Assign',
            elements: {
                'textureAtlas': new ComboBoxElement<string>()
                    .addItems(this._getTextureAtlases())
                    .setLabel(LOC.t('common.texture_atlas')),
                'blockPalette': new ComboBoxElement<string>()
                    .addItems(this._getBlockPalettes())
                    .setLabel(LOC.t('common.block_palette')),
                'dithering': new ComboBoxElement<TBlockAssigners>()
                    .addItems([{
                        displayText: LOC.t('common.ordered'),
                        payload: 'ordered-dithering',
                    },
                    {
                        displayText: LOC.t('common.random'),
                        payload: 'random-dithering',
                    },
                    {
                        displayText: LOC.t('common.off'),
                        payload: 'basic',
                    }])
                    .setLabel(LOC.t('common.dithering')),
                'fallable': new ComboBoxElement<TFallableBehaviour>()
                    .addItems([{
                        displayText: LOC.t('common.replace_falling_with_solid'),
                        payload: 'replace-falling',
                        tooltip: 'Replace all blocks that can fall with solid blocks',
                    },
                    {
                        displayText: LOC.t('common.replace_fallable_with_solid'),
                        payload: 'replace-fallable',
                        tooltip: 'Replace all blocks that will fall with solid blocks',
                    },
                    {
                        displayText: LOC.t('common.do_nothing'),
                        payload: 'do-nothing',
                        tooltip: 'Let the block fall',
                    }])
                    .setLabel(LOC.t('common.fallable_blocks')),
                'colourAccuracy': new SliderElement()
                    .setMin(1)
                    .setMax(8)
                    .setDefaultValue(5)
                    .setDecimals(1)
                    .setStep(0.1)
                    .setLabel(LOC.t('common.colour_accuracy')),
            },
            elementsOrder: ['textureAtlas', 'blockPalette', 'dithering', 'fallable', 'colourAccuracy'],
            submitButton: new ButtonElement()
                .setOnClick(() => {
                    this._appContext.do(EAction.Assign);
                })
                .setLabel(LOC.t('common.assign_blocks')),
            output: new OutputElement(),
        },
        'export': {
            label: 'Export',
            elements: {
                'export': new ComboBoxElement<TExporters>()
                    .addItems([
                        {
                            displayText: LOC.t('common.exporter_litematic'),
                            payload: 'litematic',
                        },
                        {
                            displayText: LOC.t('common.exporter_schematic'),
                            payload: 'schematic',
                        },
                        {
                            displayText: LOC.t('common.exporter_wavefront_obj'),
                            payload: 'obj',
                        },
                        {
                            displayText: LOC.t('common.exporter_sponge_schematic'),
                            payload: 'schem',
                        },
                        {
                            displayText: LOC.t('common.exporter_structure_blocks'),
                            payload: 'nbt',
                        },
                    ])
                    .setLabel(LOC.t('common.exporter_format')),
            },
            elementsOrder: ['export'],
            submitButton: new ButtonElement()
                .setLabel(LOC.t('common.export_structure'))
                .setOnClick(() => {
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
                textureAtlases.push({
                    payload: paletteID,
                    displayText: paletteName as TLocString,
                });
            }
        });

        return textureAtlases;
    }

    private _getBlockPalettes(): ComboBoxItem<string>[] {
        const blockPalettes: ComboBoxItem<string>[] = [];

        const palettes = PaletteManager.getPalettesInfo();
        for (const palette of palettes) {
            blockPalettes.push({
                payload: palette.paletteID,
                displayText: palette.paletteDisplayName as TLocString,
            });
        }

        return blockPalettes;
    }
}
