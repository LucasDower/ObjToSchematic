import { buildUI, registerUI, Group, Component, setEnabled } from "./ui/layout";
import { Exporter, Litematic, Schematic } from "./schematic";
import { VoxelManager } from "./voxel_manager";
import { Renderer } from "./renderer";
import { Mesh } from "./mesh";

import { SliderElement } from "./ui/elements/slider";
import { ComboBoxElement } from "./ui/elements/combobox";
import { FileInputElement } from "./ui/elements/file_input";

import { remote } from "electron";
import fs from "fs";
import { ButtonElement } from "./ui/elements/button";
import { LabelElement } from "./ui/elements/label";
import { OutputElement } from "./ui/elements/output";

export enum ActionReturnType {
    Success,
    Warning,
    Failure
}
interface ReturnStatus {
    message: string,
    type: ActionReturnType,
    error?: unknown
}

export enum Action {
    Load = 0,
    Simplify = 1,
    Voxelise = 2,
    Palette = 3,
    Export = 4,
}

export class AppContext {
    public ambientOcclusion: boolean;
    public dithering: boolean;

    private _gl: WebGLRenderingContext;
    private _loadedMesh?: Mesh;
    private _ui: Group[];
    private _actionMap = new Map<Action, (() => ReturnStatus | void)>();

    private static _instance: AppContext;

    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this.ambientOcclusion = true;
        this.dithering = true;

        this._actionMap.set(Action.Load,     () => { return this._load(); });
        this._actionMap.set(Action.Simplify, () => {});
        this._actionMap.set(Action.Voxelise, () => { return this._voxelise(); });
        this._actionMap.set(Action.Palette,  () => { return this._palette(); } );
        this._actionMap.set(Action.Export,   () => { return this._export(); });

        this._ui = [
            {
                label: "Input",
                components: [
                    { 
                        label: new LabelElement("label1", "Wavefront .obj file"),
                        type: new FileInputElement("objFile", "obj")
                    },
                    { 
                        label: new LabelElement("label2", "Material .mtl file"),
                        type: new FileInputElement("mtlFile", "mtl")
                    },
                ],
                submitButton: new ButtonElement("loadMesh", "Load mesh", () => { this.do(Action.Load); }),
                output: new OutputElement("output1")
            },
            {
                label: "Simplify",
                components: [
                    {
                        label: new LabelElement("label3", "Ratio"),
                        type: new SliderElement("ratio", 0.0, 1.0, 0.01, 0.5) },
                ],
                submitButton: new ButtonElement("simplifyMesh", "Simplify mesh", () => { }),
                output: new OutputElement("output2")
            },
            {
                label: "Build",
                components: [
                    {
                        label: new LabelElement("label4", "Voxel size"),
                        type: new SliderElement("voxelSize", 0.01, 0.5, 0.01, 0.1)
                    },
                    {
                        label: new LabelElement("label5", "Ambient occlusion"),
                        type: new ComboBoxElement("ambientOcclusion", [
                            { id: "on", displayText: "On (recommended)" },
                            { id: "off", displayText: "Off (faster)" },
                        ])
                    },
                ],
                submitButton: new ButtonElement("voxeliseMesh", "Voxelise mesh", () => { this.do(Action.Voxelise); }),
                output: new OutputElement("output3")
            },
            {
                label: "Palette",
                components: [
                    {
                        label: new LabelElement("label6", "Block palette"),
                        type: new ComboBoxElement("blockPalette", [
                            { id: "default", displayText: "Default" }
                        ])
                    },
                    {
                        label: new LabelElement("label7", "Choice method"),
                        type: new ComboBoxElement("choiceMethod", [
                            { id: "euclidian", displayText: "Euclidian distance" }
                        ])
                    },
                    {
                        label: new LabelElement("label8", "Dithering"),
                        type: new ComboBoxElement("dithering", [
                            { id: "on", displayText: "On (recommended)" },
                            { id: "off", displayText: "Off" },
                        ])
                    },
                ],
                submitButton: new ButtonElement("assignBlocks", "Assign blocks", () => { this.do(Action.Palette); }),
                output: new OutputElement("output4")
            },
            {
                label: "Export",
                components: [
                    { 
                        label: new LabelElement("label9", "File format"),
                        type: new ComboBoxElement("fileFormat",
                        [
                            { id: "litematic", displayText: "Litematic" },
                            { id: "schematic", displayText: "Schematic" },
                        ])
                    },
                ],
                submitButton: new ButtonElement("exportStructure", "Export structure", () => { this.do(Action.Export); }),
                output: new OutputElement("output5")
            }
        ]

        buildUI(this._ui);
        registerUI(this._ui);
        setEnabled(this._ui[1], false);
        setEnabled(this._ui[2], false);
        setEnabled(this._ui[3], false);
        setEnabled(this._ui[4], false);

        const gl = (<HTMLCanvasElement>document.getElementById('canvas')).getContext("webgl");
        if (!gl) {
            throw Error("Could not load WebGL context");
        }
        this._gl = gl;
    }

    public do(action: Action) {
        const status = this._actionMap.get(action)!();
        if (status) {
            this._ui[action].output.setMessage(status.message, status.type);
            if (status.error) {
                console.error(status.error);
            }
        }
    }

    private _load(): ReturnStatus {
        setEnabled(this._ui[1], false);
        setEnabled(this._ui[2], false);
        setEnabled(this._ui[3], false);
        setEnabled(this._ui[4], false);

        const objPath = (<FileInputElement>this._ui[0].components[0].type).getValue();
        if (!fs.existsSync(objPath)) {
            return { message: "Selected .obj cannot be found", type: ActionReturnType.Failure };
        }

        const mtlPath = (<FileInputElement>this._ui[0].components[1].type).getValue();
        if (!fs.existsSync(mtlPath)) {
            return { message: "Selected .mtl cannot be found", type: ActionReturnType.Failure };
        }

        try {
            this._loadedMesh = new Mesh(objPath, this._gl);
            this._loadedMesh.loadTextures(this._gl);
        } catch (err: unknown) {
            return { error: err, message: "Could not load mesh", type: ActionReturnType.Failure };
        }

        try {
            const renderer = Renderer.Get;
            renderer.clear();
            renderer.registerMesh(this._loadedMesh);
            renderer.compile();
        } catch (err: unknown) {
            return { message: "Could not render mesh", type: ActionReturnType.Failure };
        }

        setEnabled(this._ui[2], true);
        return { message: "Loaded successfully", type: ActionReturnType.Success };
    }

    private _voxelise(): ReturnStatus {
        setEnabled(this._ui[3], false);
        setEnabled(this._ui[4], false);

        const voxelSize = (<SliderElement>this._ui[2].components[0].type).getValue();
        const ambientOcclusion = (<ComboBoxElement>this._ui[2].components[1].type).getValue();
        this.ambientOcclusion = ambientOcclusion === "on";

        try {
            const voxelManager = VoxelManager.Get;
            voxelManager.setVoxelSize(voxelSize);
            voxelManager.voxeliseMesh(this._loadedMesh!);

            const renderer = Renderer.Get;
            renderer.clear();
            renderer.registerVoxelMesh();
            renderer.compile();
        } catch (err: any) {
            return { error: err, message: "Could not register voxel mesh", type: ActionReturnType.Failure };
        }

        setEnabled(this._ui[3], true);
        return { message: "Voxelised successfully", type: ActionReturnType.Success };
    }

    private _palette(): ReturnStatus {
        setEnabled(this._ui[4], false);
        
        const dithering = (<ComboBoxElement>this._ui[3].components[2].type).getValue();
        this.dithering = dithering === "on";

        try {
            const voxelManager = VoxelManager.Get;
            voxelManager.assignBlocks();

            const renderer = Renderer.Get;
            renderer.clear();
            renderer.registerVoxelMesh();
            renderer.compile();
        } catch (err: any) {
            return { error: err, message: "Could not register voxel mesh", type: ActionReturnType.Failure };
        }

        setEnabled(this._ui[4], true);
        return { message: "Blocks assigned successfully", type: ActionReturnType.Success };
    }

    private _export(): ReturnStatus {
        const exportFormat = (<ComboBoxElement>this._ui[4].components[0].type).getValue();
        let exporter: Exporter;
        if (exportFormat === "schematic") {
            exporter = new Schematic();
        } else {
            exporter = new Litematic();
        }

        const filePath = remote.dialog.showSaveDialogSync({
            title: "Save structure",
            buttonLabel: "Save",
            filters: [exporter.getFormatFilter()]
        });

        if (filePath === undefined) {
            return { message: "Output cancelled", type: ActionReturnType.Warning };
        }

        try {
            exporter.export(filePath);
        } catch (err: unknown) {
            return { error: err, message: "Failed to export", type: ActionReturnType.Failure };
        }

        return { message: "Successfully exported", type: ActionReturnType.Success };
    }

    public draw() {
        Renderer.Get.draw();
    }
}