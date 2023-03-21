import Split from 'split.js';

import { AppContext } from '../app_context';
import { FallableBehaviour } from '../block_mesh';
import { ArcballCamera } from '../camera';
import { TExporters } from '../exporters/exporters';
import { PaletteManager, TPalettes } from '../palette';
import { MeshType, Renderer } from '../renderer';
import { EAction } from '../util';
import { ASSERT } from '../util/error_util';
import { LOG } from '../util/log_util';
import { TAxis } from '../util/type_util';
import { TDithering } from '../util/type_util';
import { UIUtil } from '../util/ui_util';
import { TVoxelOverlapRule } from '../voxel_mesh';
import { TVoxelisers } from '../voxelisers/voxelisers';
import { ButtonComponent } from './components/button';
import { CheckboxComponent } from './components/checkbox';
import { ComboboxComponent, ComboBoxItem } from './components/combobox';
import { ConfigComponent } from './components/config';
import { ObjFileComponent } from './components/file_input';
import { HeaderComponent } from './components/header';
import { PaletteComponent } from './components/palette';
import { SliderComponent } from './components/slider';
import { ToolbarItemComponent } from './components/toolbar_item';
import { VectorSpinboxComponent } from './components/vector_spinbox';
import { AppConsole } from './console';
import { AppIcons } from './icons';
import { HTMLBuilder, MiscComponents } from './misc';

export type Group = {
    label: string;
    components: { [key: string]: ConfigComponent<any, any> };
    componentOrder: string[];
    execButton: ButtonComponent;
}

export interface ToolbarGroup {
    components: { [key: string]: ToolbarItemComponent };
    componentOrder: string[];
}

export class UI {
    public uiOrder = ['import', 'materials', 'voxelise', 'assign', 'export'];
    private _ui = {
        'import': {
            label: '1. Import',
            components: {
                'input': new ObjFileComponent()
                    .setLabel('Wavefront .obj file'),
                'rotation': new VectorSpinboxComponent()
                    .setLabel('Rotation')
                    .setWrap(360)
                    .setUnits('°'),
            },
            componentOrder: ['input', 'rotation'],
            execButton: new ButtonComponent()
                .setOnClick(() => {
                    this._appContext.do(EAction.Import);
                })
                .setLabel('Load mesh'),
        },
        'materials': {
            label: '2. Materials',
            components: {
            },
            componentOrder: [],
            execButton: new ButtonComponent()
                .setOnClick(() => {
                    this._appContext.do(EAction.Materials);
                })
                .setLabel('Update materials'),
        },
        'voxelise': {
            label: '3. Voxelise',
            components: {
                'constraintAxis': new ComboboxComponent<TAxis>()
                    .addItem({ payload: 'y', displayText: 'Y (height) (green)' })
                    .addItem({ payload: 'x', displayText: 'X (width) (red)' })
                    .addItem({ payload: 'z', displayText: 'Z (depth) (blue)' })
                    .setLabel('Constraint axis')
                    .addValueChangedListener((value: TAxis) => {
                        /*
                        switch (value) {
                            case 'x':
                                this._ui.voxelise.components.size.setMax(this._appContext.maxConstraint?.x ?? 400);
                                break;
                            case 'y':
                                this._ui.voxelise.components.size.setMax(this._appContext.maxConstraint?.y ?? AppConfig.Get.CONSTRAINT_MAXIMUM_HEIGHT);
                                break;
                            case 'z':
                                this._ui.voxelise.components.size.setMax(this._appContext.maxConstraint?.z ?? 400);
                                break;
                        }
                        */
                    }),
                'size': new SliderComponent()
                    .setMin(3)
                    .setMax(380)
                    .setDefaultValue(80)
                    .setDecimals(0)
                    .setStep(1)
                    .setLabel('Size'),
                'voxeliser': new ComboboxComponent<TVoxelisers>()
                    .addItem({ payload: 'ray-based', displayText: 'Ray-based' })
                    .addItem({ payload: 'bvh-ray', displayText: 'BVH Ray-based' })
                    .addItem({ payload: 'ncrb', displayText: 'NCRB' })
                    .setLabel('Algorithm'),
                'ambientOcclusion': new CheckboxComponent()
                    .setCheckedText('On (recommended)')
                    .setUncheckedText('Off (faster)')
                    .setDefaultValue(true)
                    .setLabel('Ambient occlusion'),
                'multisampleColouring': new CheckboxComponent()
                    .setCheckedText('On (recommended)')
                    .setUncheckedText('Off (faster)')
                    .setDefaultValue(true)
                    .setLabel('Multisampling'),
                'voxelOverlapRule': new ComboboxComponent<TVoxelOverlapRule>()
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
            componentOrder: [
                'constraintAxis',
                'size',
                'voxeliser',
                'ambientOcclusion',
                'multisampleColouring',
                'voxelOverlapRule',
            ],
            execButton: new ButtonComponent()
                .setOnClick(() => {
                    this._appContext.do(EAction.Voxelise);
                })
                .setLabel('Voxelise mesh'),
        },
        'assign': {
            label: '4. Assign',
            components: {
                'textureAtlas': new ComboboxComponent<string>()
                    .addItem({ displayText: 'Vanilla', payload: 'vanilla' })
                    .setLabel('Texture atlas')
                    .setShouldObeyGroupEnables(false),
                'blockPalette': new PaletteComponent()
                    .setLabel('Block palette'),
                'dithering': new ComboboxComponent<TDithering>()
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
                'fallable': new ComboboxComponent<FallableBehaviour>()
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
                'colourAccuracy': new SliderComponent()
                    .setMin(1)
                    .setMax(8)
                    .setDefaultValue(5)
                    .setDecimals(1)
                    .setStep(0.1)
                    .setLabel('Colour accuracy'),
                'contextualAveraging': new CheckboxComponent()
                    .setCheckedText('On (recommended)')
                    .setUncheckedText('Off (faster)')
                    .setDefaultValue(true)
                    .setLabel('Smart averaging'),
                'errorWeight': new SliderComponent()
                    .setMin(0.0)
                    .setMax(2.0)
                    .setDefaultValue(0.2)
                    .setDecimals(2)
                    .setStep(0.01)
                    .setLabel('Smoothness'),
                'calculateLighting': new CheckboxComponent()
                    .setCheckedText('On')
                    .setUncheckedText('Off')
                    .setDefaultValue(false)
                    .setLabel('Calculate lighting')
                    .addValueChangedListener((newValue: boolean) => {
                        const isEnabled = this._ui.assign.components.calculateLighting.getEnabled();
                        this._ui.assign.components.lightThreshold.setEnabled(newValue && isEnabled, false);
                    })
                    .addEnabledChangedListener((isEnabled: boolean) => {
                        const value = this._ui.assign.components.calculateLighting.getValue();
                        this._ui.assign.components.lightThreshold.setEnabled(value && isEnabled, false);
                    }),
                'lightThreshold': new SliderComponent()
                    .setMin(0)
                    .setMax(14)
                    .setDefaultValue(1)
                    .setDecimals(0)
                    .setStep(1)
                    .setLabel('Light threshold')
                    .setShouldObeyGroupEnables(false),
            },
            componentOrder: [
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
            execButton: new ButtonComponent()
                .setOnClick(() => {
                    this._appContext.do(EAction.Assign);
                })
                .setLabel('Assign blocks'),
        },
        'export': {
            label: '5. Export',
            components: {
                'export': new ComboboxComponent<TExporters>()
                    .addItems([
                        {
                            displayText: 'Litematic (.litematic)',
                            payload: 'litematic',
                        },
                        {
                            displayText: 'Schematic (.schematic)',
                            payload: 'schematic',
                        },
                        /*
                        {
                            displayText: 'Wavefront OBJ (.obj)',
                            payload: 'obj',
                        },
                        */
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
            componentOrder: ['export'],
            execButton: new ButtonComponent()
                .setLabel('Export structure')
                .setOnClick(() => {
                    this._appContext.do(EAction.Export);
                }),
        },
    };

    private _toolbarLeft = {
        groups: {
            'viewmode': {
                components: {
                    'mesh': new ToolbarItemComponent({ id: 'mesh', iconSVG: AppIcons.MESH })
                        .onClick(() => {
                            Renderer.Get.setModelToUse(MeshType.TriangleMesh);
                        })
                        .isActive(() => {
                            return Renderer.Get.getActiveMeshType() === MeshType.TriangleMesh;
                        })
                        .isEnabled(() => {
                            return Renderer.Get.getModelsAvailable() >= MeshType.TriangleMesh;
                        }),
                    'voxelMesh': new ToolbarItemComponent({ id: 'voxelMesh', iconSVG: AppIcons.VOXEL })
                        .onClick(() => {
                            Renderer.Get.setModelToUse(MeshType.VoxelMesh);
                        })
                        .isActive(() => {
                            return Renderer.Get.getActiveMeshType() === MeshType.VoxelMesh;
                        })
                        .isEnabled(() => {
                            return Renderer.Get.getModelsAvailable() >= MeshType.VoxelMesh;
                        }),
                    'blockMesh': new ToolbarItemComponent({ id: 'blockMesh', iconSVG: AppIcons.BLOCK })
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
                componentOrder: ['mesh', 'voxelMesh', 'blockMesh'],
            },
            'debug': {
                components: {
                    'grid': new ToolbarItemComponent({ id: 'grid', iconSVG: AppIcons.GRID })
                        .onClick(() => {
                            Renderer.Get.toggleIsGridEnabled();
                        })
                        .isActive(() => {
                            return Renderer.Get.isGridEnabled();
                        })
                        .isEnabled(() => {
                            return Renderer.Get.getActiveMeshType() !== MeshType.None;
                        }),
                    'axes': new ToolbarItemComponent({ id: 'axes', iconSVG: AppIcons.AXES })
                        .onClick(() => {
                            Renderer.Get.toggleIsAxesEnabled();
                        })
                        .isActive(() => {
                            return Renderer.Get.isAxesEnabled();
                        }),
                    'night-vision': new ToolbarItemComponent({ id: 'night', iconSVG: AppIcons.BULB })
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
                componentOrder: ['grid', 'axes', 'night-vision'],
            },

        },
        groupsOrder: ['viewmode', 'debug'],
    };

    private _toolbarRight = {
        groups: {
            'zoom': {
                components: {
                    'zoomOut': new ToolbarItemComponent({ id: 'zout', iconSVG: AppIcons.MINUS })
                        .onClick(() => {
                            ArcballCamera.Get.onZoomOut();
                        }),
                    'zoomIn': new ToolbarItemComponent({ id: 'zin', iconSVG: AppIcons.PLUS })
                        .onClick(() => {
                            ArcballCamera.Get.onZoomIn();
                        }),
                    'reset': new ToolbarItemComponent({ id: 'reset', iconSVG: AppIcons.CENTRE })
                        .onClick(() => {
                            ArcballCamera.Get.reset();
                        }),
                },
                componentOrder: ['zoomOut', 'zoomIn', 'reset'],
            },
            'camera': {
                components: {
                    'perspective': new ToolbarItemComponent({ id: 'pers', iconSVG: AppIcons.PERSPECTIVE })
                        .onClick(() => {
                            ArcballCamera.Get.setCameraMode('perspective');
                        })
                        .isActive(() => {
                            return ArcballCamera.Get.isPerspective();
                        }),
                    'orthographic': new ToolbarItemComponent({ id: 'orth', iconSVG: AppIcons.ORTHOGRAPHIC })
                        .onClick(() => {
                            ArcballCamera.Get.setCameraMode('orthographic');
                        })
                        .isActive(() => {
                            return ArcballCamera.Get.isOrthographic();
                        }),
                },
                componentOrder: ['perspective', 'orthographic'],
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

        const canvasColumn = UIUtil.getElementById('col-canvas');
        if (ArcballCamera.Get.isUserRotating || ArcballCamera.Get.isUserTranslating) {
            canvasColumn.style.cursor = 'grabbing';
        } else {
            canvasColumn.style.cursor = 'grab';
        }

        for (const groupName in this._toolbarLeftDull) {
            const toolbarGroup = this._toolbarLeftDull[groupName];
            for (const toolbarItem of toolbarGroup.componentOrder) {
                toolbarGroup.components[toolbarItem].tick();
            }
        }

        for (const groupName in this._toolbarRightDull) {
            const toolbarGroup = this._toolbarRightDull[groupName];
            for (const toolbarItem of toolbarGroup.componentOrder) {
                toolbarGroup.components[toolbarItem].tick();
            }
        }
    }

    public build() {
        // Build properties
        {
            const sidebarHTML = new HTMLBuilder();

            sidebarHTML.add(`<div class="container-properties">`);
            {
                sidebarHTML.add(HeaderComponent.Get.generateHTML());

                for (const groupName of this.uiOrder) {
                    const group = this._uiDull[groupName];
                    sidebarHTML.add(this._getGroupHTML(group));
                }
            }
            sidebarHTML.add(`</div>`);

            sidebarHTML.placeInto('properties');
        }

        // Build toolbar
        {
            const toolbarHTML = new HTMLBuilder();

            // Left
            toolbarHTML.add('<div class="toolbar-column">');
            for (const toolbarGroupName of this._toolbarLeft.groupsOrder) {
                toolbarHTML.add('<div class="toolbar-group">');
                const toolbarGroup = this._toolbarLeftDull[toolbarGroupName];
                for (const groupElementName of toolbarGroup.componentOrder) {
                    const groupElement = toolbarGroup.components[groupElementName];
                    toolbarHTML.add(groupElement.generateHTML());
                }
                toolbarHTML.add('</div>');
            }
            toolbarHTML.add('</div>');

            // Right
            toolbarHTML.add('<div class="toolbar-column">');
            for (const toolbarGroupName of this._toolbarRight.groupsOrder) {
                toolbarHTML.add('<div class="toolbar-group">');
                const toolbarGroup = this._toolbarRightDull[toolbarGroupName];
                for (const groupElementName of toolbarGroup.componentOrder) {
                    const groupElement = toolbarGroup.components[groupElementName];
                    toolbarHTML.add(groupElement.generateHTML());
                }
                toolbarHTML.add('</div>');
            }
            toolbarHTML.add('</div>');

            toolbarHTML.placeInto('toolbar');
        }

        // Build console
        AppConsole.Get.build();

        Split(['.column-sidebar', '.column-canvas'], {
            sizes: [20, 80],
            minSize: [600, 500],
            gutterSize: 5,
        });

        Split(['.column-properties', '.column-console'], {
            sizes: [85, 15],
            minSize: [0, 0],
            direction: 'vertical',
            gutterSize: 5,
        });
    }

    private _forEachComponent(action: EAction, functor: (component: ConfigComponent<unknown, unknown>) => void) {
        const group = this._getGroup(action);
        for (const elementName of group.componentOrder) {
            const element = group.components[elementName];
            functor(element);
        }
    }

    /**
     * Caches the current value of each component in an action group.
     */
    public cacheValues(action: EAction) {
        this._forEachComponent(action, (component) => {
            component.cacheValue();
        });
    }

    /**
     * Rebuilds the HTML for all components in an action group.
     */
    public refreshComponents(action: EAction) {
        const group = this._getGroup(action);

        const element = document.getElementById(`subcomponents_${group.label}`);
        ASSERT(element !== null);

        element.innerHTML = this._getComponentsHTML(group);

        this._forEachComponent(action, (component) => {
            component.registerEvents();
            component.finalise();
        });
    }

    private _getComponentsHTML(group: Group) {
        let groupHTML = '';
        for (const elementName of group.componentOrder) {
            const element = group.components[elementName];
            ASSERT(element !== undefined, `No element for: ${elementName}`);
            groupHTML += element.generateHTML();
        }
        return groupHTML;
    }

    private _getGroupHTML(group: Group) {
        return `
            ${MiscComponents.createGroupHeader(group.label.toUpperCase())}
            <div class="component-group" id="subcomponents_${group.label}">
                ${this._getComponentsHTML(group)}
            </div>
            ${group.execButton.generateHTML()}
        `;
    }

    public getActionButton(action: EAction) {
        const group = this._getGroup(action);
        return group.execButton;
    }

    public registerEvents() {
        HeaderComponent.Get.registerEvents();
        HeaderComponent.Get.finalise();

        for (let action = 0; action < EAction.MAX; ++action) {
            this._forEachComponent(action, (component) => {
                component.registerEvents();
                component.finalise();
            });

            const group = this._getGroup(action);
            group.execButton.registerEvents();
            group.execButton.finalise();
        }

        // Register toolbar left
        for (const toolbarGroupName of this._toolbarLeft.groupsOrder) {
            const toolbarGroup = this._toolbarLeftDull[toolbarGroupName];
            for (const groupElementName of toolbarGroup.componentOrder) {
                const element = toolbarGroup.components[groupElementName];
                element.registerEvents();
                element.finalise();
            }
        }
        // Register toolbar right
        for (const toolbarGroupName of this._toolbarRight.groupsOrder) {
            const toolbarGroup = this._toolbarRightDull[toolbarGroupName];
            for (const groupElementName of toolbarGroup.componentOrder) {
                const element = toolbarGroup.components[groupElementName];
                element.registerEvents();
                element.finalise();
            }
        }
    }

    public get layout() {
        return this._ui;
    }

    public get layoutDull() {
        return this._uiDull;
    }

    /**
     * Enable a specific action.
     */
    public enable(action: EAction) {
        this._forEachComponent(action, (component) => {
            component.setEnabled(true);
        });
        this._getGroup(action).execButton.setEnabled(true);
    }

    /**
     * Enable all actions up to and including a specific action.
     */
    public enableTo(action: EAction) {
        for (let i = 0; i <= action; ++i) {
            this.enable(i);
        }
    }

    /**
     * Disable a specific action and its dependent actions.
     */
    public disable(action: EAction) {
        for (let i = action; i < EAction.MAX; ++i) {
            this._forEachComponent(action, (component) => {
                component.setEnabled(false);
            });

            this._getGroup(action).execButton.setEnabled(false);
        }
    }

    /**
     * Disables all the actions.
     */
    public disableAll() {
        this.disable(EAction.Import);
    }

    /**
     * Util function to get the `Group` associated with an `EAction`.
     */
    private _getGroup(action: EAction): Group {
        const key = this.uiOrder[action];
        return this._uiDull[key];
    }
}
