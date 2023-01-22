import fs from 'fs';

import { AppContext } from '../app_context';
import { FallableBehaviour } from '../block_mesh';
import { ArcballCamera } from '../camera';
import { TExporters } from '../exporters/exporters';
import { PaletteManager } from '../palette';
import { MeshType, Renderer } from '../renderer';
import { EAction } from '../util';
import { ASSERT } from '../util/error_util';
import { LOG } from '../util/log_util';
import { AppPaths } from '../util/path_util';
import { TAxis } from '../util/type_util';
import { TDithering } from '../util/type_util';
import { TVoxelOverlapRule } from '../voxel_mesh';
import { TVoxelisers } from '../voxelisers/voxelisers';
import { ButtonElement } from './elements/button';
import { CheckboxElement } from './elements/checkbox';
import { ComboBoxElement, ComboBoxItem } from './elements/combobox';
import { ConfigUIElement } from './elements/config_element';
import { FileInputElement } from './elements/file_input';
import { OutputElement } from './elements/output';
import { SliderElement } from './elements/slider';
import { ToolbarItemElement } from './elements/toolbar_item';
import { VectorSpinboxElement } from './elements/vector_spinbox';

export interface Group {
    label: string;
    elements: { [key: string]: ConfigUIElement<any, any> };
    elementsOrder: string[];
    submitButton: ButtonElement;
    output: OutputElement;
}

export interface ToolbarGroup {
    elements: { [key: string]: ToolbarItemElement };
    elementsOrder: string[];
}

export class UI {
    public uiOrder = ['import', 'materials', 'voxelise', 'assign', 'export'];
    private _ui = {
        'import': {
            label: 'Import',
            elements: {
                'input': new FileInputElement()
                    .setFileExtensions(['obj'])
                    .setLabel('Wavefront .obj file'),
                'rotation': new VectorSpinboxElement()
                    .setLabel('Rotation')
                    .setWrap(360)
                    .setUnits('°'),
            },
            elementsOrder: ['input', 'rotation'],
            submitButton: new ButtonElement()
                .setOnClick(() => {
                    this._appContext.do(EAction.Import);
                })
                .setLabel('Load mesh'),
            output: new OutputElement(),
        },
        'materials': {
            label: 'Materials',
            elements: {
            },
            elementsOrder: [],
            submitButton: new ButtonElement()
                .setOnClick(() => {
                    this._appContext.do(EAction.Materials);
                })
                .setLabel('Update materials'),
            output: new OutputElement(),
        },
        'voxelise': {
            label: 'Voxelise',
            elements: {
                'constraintAxis': new ComboBoxElement<TAxis>()
                    .addItem({ payload: 'y', displayText: 'Y (height) (green)' })
                    .addItem({ payload: 'x', displayText: 'X (width) (red)' })
                    .addItem({ payload: 'z', displayText: 'Z (depth) (blue)' })
                    .setLabel('Constraint axis')
                    .addValueChangedListener((value: TAxis) => {
                        /*
                        switch (value) {
                            case 'x':
                                this._ui.voxelise.elements.size.setMax(this._appContext.maxConstraint?.x ?? 400);
                                break;
                            case 'y':
                                this._ui.voxelise.elements.size.setMax(this._appContext.maxConstraint?.y ?? AppConfig.Get.CONSTRAINT_MAXIMUM_HEIGHT);
                                break;
                            case 'z':
                                this._ui.voxelise.elements.size.setMax(this._appContext.maxConstraint?.z ?? 400);
                                break;
                        }
                        */
                    }),
                'size': new SliderElement()
                    .setMin(3)
                    .setMax(380)
                    .setDefaultValue(80)
                    .setDecimals(0)
                    .setStep(1)
                    .setLabel('Size'),
                'voxeliser': new ComboBoxElement<TVoxelisers>()
                    .addItem({ payload: 'bvh-ray', displayText: 'BVH Ray-based' })
                    .addItem({ payload: 'ncrb', displayText: 'NCRB' })
                    .addItem({ payload: 'ray-based', displayText: 'Ray-based (legacy)' })
                    .setLabel('Algorithm'),
                'ambientOcclusion': new CheckboxElement()
                    .setCheckedText('On (recommended)')
                    .setUncheckedText('Off (faster)')
                    .setDefaultValue(true)
                    .setLabel('Ambient occlusion'),
                'multisampleColouring': new CheckboxElement()
                    .setCheckedText('On (recommended)')
                    .setUncheckedText('Off (faster)')
                    .setDefaultValue(true)
                    .setLabel('Multisampling'),
                'voxelOverlapRule': new ComboBoxElement<TVoxelOverlapRule>()
                    .addItem({
                        displayText: 'Average (recommended)',
                        payload: 'average',
                        tooltip: 'If multiple voxels are placed in the same location, take the average of their colours',
                    })
                    .addItem({
                        displayText: 'First',
                        payload: 'first',
                        tooltip: 'If multiple voxels are placed in the same location, use the first voxel\'s colour',
                    })
                    .setLabel('Voxel overlap'),
            },
            elementsOrder: [
                'constraintAxis',
                'size',
                'voxeliser',
                'ambientOcclusion',
                'multisampleColouring',
                'voxelOverlapRule',
            ],
            submitButton: new ButtonElement()
                .setOnClick(() => {
                    this._appContext.do(EAction.Voxelise);
                })
                .setLabel('Voxelise mesh'),
            output: new OutputElement(),
        },
        'assign': {
            label: 'Assign',
            elements: {
                'textureAtlas': new ComboBoxElement<string>()
                    .addItems(this._getTextureAtlases())
                    .setLabel('Texture atlas'),
                'blockPalette': new ComboBoxElement<string>()
                    .addItems(this._getBlockPalettes())
                    .setLabel('Block palette'),
                'dithering': new ComboBoxElement<TDithering>()
                    .addItems([{
                        displayText: 'Ordered',
                        payload: 'ordered',
                    },
                    {
                        displayText: 'Random',
                        payload: 'random',
                    },
                    {
                        displayText: 'Off',
                        payload: 'off',
                    }])
                    .setLabel('Dithering'),
                'fallable': new ComboBoxElement<FallableBehaviour>()
                    .addItems([{
                        displayText: 'Replace falling with solid',
                        payload: 'replace-falling',
                        tooltip: 'Replace all blocks that will fall with solid blocks',
                    },
                    {
                        displayText: 'Replace fallable with solid',
                        payload: 'replace-fallable',
                        tooltip: 'Replace all blocks that can fall with solid blocks',
                    },
                    {
                        displayText: 'Do nothing',
                        payload: 'do-nothing',
                        tooltip: 'Let the block fall',
                    }])
                    .setLabel('Fallable blocks'),
                'colourAccuracy': new SliderElement()
                    .setMin(1)
                    .setMax(8)
                    .setDefaultValue(5)
                    .setDecimals(1)
                    .setStep(0.1)
                    .setLabel('Colour accuracy'),
                'contextualAveraging': new CheckboxElement()
                    .setCheckedText('On (recommended)')
                    .setUncheckedText('Off (faster)')
                    .setDefaultValue(true)
                    .setLabel('Smart averaging'),
                'errorWeight': new SliderElement()
                    .setMin(0.0)
                    .setMax(2.0)
                    .setDefaultValue(0.2)
                    .setDecimals(2)
                    .setStep(0.01)
                    .setLabel('Smoothness'),
                'calculateLighting': new CheckboxElement()
                    .setCheckedText('On')
                    .setUncheckedText('Off')
                    .setDefaultValue(false)
                    .setLabel('Calculate lighting')
                    .addValueChangedListener((value: boolean) => {
                        if (value) {
                            this._ui.assign.elements.lightThreshold.setEnabled(true, false);
                        } else {
                            this._ui.assign.elements.lightThreshold.setEnabled(false, false);
                        }
                    }),
                'lightThreshold': new SliderElement()
                    .setMin(0)
                    .setMax(14)
                    .setDefaultValue(1)
                    .setDecimals(0)
                    .setStep(1)
                    .setLabel('Light threshold'),
            },
            elementsOrder: [
                'textureAtlas',
                'blockPalette',
                'dithering',
                'fallable',
                'colourAccuracy',
                'contextualAveraging',
                'errorWeight',
                'calculateLighting',
                'lightThreshold',
            ],
            submitButton: new ButtonElement()
                .setOnClick(() => {
                    this._appContext.do(EAction.Assign);
                })
                .setLabel('Assign blocks'),
            output: new OutputElement(),
        },
        'export': {
            label: 'Export',
            elements: {
                'export': new ComboBoxElement<TExporters>()
                    .addItems([
                        {
                            displayText: 'Litematic (.litematic)',
                            payload: 'litematic',
                        },
                        {
                            displayText: 'Schematic (.schematic)',
                            payload: 'schematic',
                        },
                        {
                            displayText: 'Wavefront OBJ (.obj)',
                            payload: 'obj',
                        },
                        {
                            displayText: 'Sponge Schematic (.schem)',
                            payload: 'schem',
                        },
                        {
                            displayText: 'Structure blocks (.nbt)',
                            payload: 'nbt',
                        },
                    ])
                    .setLabel('Exporter'),
            },
            elementsOrder: ['export'],
            submitButton: new ButtonElement()
                .setLabel('Export structure')
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
                    'night-vision': new ToolbarItemElement({ icon: 'bulb' })
                        .onClick(() => {
                            Renderer.Get.toggleIsNightVisionEnabled();
                        })
                        .isActive(() => {
                            return Renderer.Get.isNightVisionEnabled();
                        })
                        .isEnabled(() => {
                            return Renderer.Get.canToggleNightVision();
                        }),
                },
                elementsOrder: ['grid', 'axes', 'night-vision'],
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

    public constructor(appContext: AppContext) {
        this._appContext = appContext;
    }

    public tick(isBusy: boolean) {
        if (isBusy) {
            document.body.style.cursor = 'progress';
        } else {
            document.body.style.cursor = 'default';
        }

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
            <div class="property">
                <div style="flex-grow: 1">
                    <div class="h-div">
                    </div>
                </div>
                <div class="group-heading">
                    ${group.label.toUpperCase()}
                </div>
                <div style="flex-grow: 1">
                    <div class="h-div">
                    </div>
                </div>
            </div>
            `;
            groupHTML[groupName] += this._getGroupHTML(group);
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

    public refreshSubcomponents(group: Group) {
        const element = document.getElementById(`subcomponents_${group.label}`);
        ASSERT(element !== null);

        element.innerHTML = this._getGroupSubcomponentsHTML(group);

        for (const elementName in group.elements) {
            const element = group.elements[elementName];
            element.registerEvents();
            element.finalise();
        }
    }

    private _getGroupSubcomponentsHTML(group: Group) {
        let groupHTML = '';
        for (const elementName of group.elementsOrder) {
            const element = group.elements[elementName];
            ASSERT(element !== undefined, `No element for: ${elementName}`);
            groupHTML += this._buildSubcomponent(element);
        }
        return groupHTML;
    }

    private _getGroupHTML(group: Group) {
        return `
            <div id="subcomponents_${group.label}">
                ${this._getGroupSubcomponentsHTML(group)}
            </div>
            <div class="property">
                <div class="prop-value-container">
                    ${group.submitButton.generateHTML()}
                </div>
            </div>
            <div class="property">
                ${group.output.generateHTML()}
            </div>
        `;
    }

    private _buildSubcomponent(element: ConfigUIElement<any, any>) {
        return `
            <div class="property">
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
                element.finalise();
            }
            group.submitButton.registerEvents();
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
                textureAtlases.push({ payload: paletteID, displayText: paletteName });
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
                displayText: palette.paletteDisplayName,
            });
        }

        return blockPalettes;
    }
}
