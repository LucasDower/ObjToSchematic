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

interface ReturnStatus {
    message: string,
    //style: ToastStyle,
    error?: unknown
}

export class AppContext {
    public ambientOcclusion: boolean;

    private _gl: WebGLRenderingContext;
    private _loadedMesh?: Mesh;
    private _ui: Group[];

    private static _instance: AppContext;

    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this.ambientOcclusion = true;

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
                submitButton: new ButtonElement("loadMesh", "Load mesh", () => { this._load(); })
            },
            {
                label: "Simplify",
                components: [
                    {
                        label: new LabelElement("label3", "Ratio"),
                        type: new SliderElement("ratio", 0.0, 1.0, 0.01, 0.5) },
                ],
                submitButton: new ButtonElement("simplifyMesh", "Simplify mesh", () => { })
            },
            {
                label: "Build",
                components: [
                    {
                        label: new LabelElement("label4", "Voxel size"),
                        type: new SliderElement("voxelSize", 0.01, 1.0, 0.01, 0.1)
                    },
                    {
                        label: new LabelElement("label5", "Ambient occlusion"),
                        type: new ComboBoxElement("ambientOcclusion", [
                            { id: "on", displayText: "On (recommended)" },
                            { id: "off", displayText: "Off (faster)" },
                        ])
                    },
                ],
                submitButton: new ButtonElement("voxeliseMesh", "Voxelise mesh", () => { this._voxelise(); })
            },
            {
                label: "Palette",
                components: [
                    {
                        label: new LabelElement("label6", "Block palette"),
                        type: new ComboBoxElement("blockPalette", [])
                    },
                    {
                        label: new LabelElement("label7", "Choice method"),
                        type: new ComboBoxElement("choiceMethod", [])
                    },
                    {
                        label: new LabelElement("label8", "Dithering"),
                        type: new ComboBoxElement("dithering", [])
                    },
                ],
                submitButton: new ButtonElement("assignBlocks", "Assign blocks", () => { this._export(); })
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
                submitButton: new ButtonElement("exportStructure", "Export structure", () => { this._export(); })
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

    private _load(): ReturnStatus {
        setEnabled(this._ui[2], false);
        setEnabled(this._ui[4], false);

        const objPath = (<FileInputElement>this._ui[0].components[0].type).getValue();
        if (!fs.existsSync(objPath)) {
            return { message: "Selected .obj cannot be found" };
        }

        const mtlPath = (<FileInputElement>this._ui[0].components[1].type).getValue();
        if (!fs.existsSync(mtlPath)) {
            return { message: "Selected .mtl cannot be found" };
        }

        try {
            this._loadedMesh = new Mesh(objPath, this._gl);
            this._loadedMesh.loadTextures(this._gl);
        } catch (err: unknown) {
            return { error: err, message: "Could not load mesh" };
        }

        try {
            const renderer = Renderer.Get;
            renderer.clear();
            renderer.registerMesh(this._loadedMesh);
            renderer.compile();
        } catch (err: unknown) {
            return { message: "Could not render mesh" };
        }

        setEnabled(this._ui[2], true);
        return { message: "Loaded successfully" };
    }

    private _voxelise(): ReturnStatus {
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
            return { error: err, message: "Could not register voxel mesh" };//, style: ToastStyle.Failure };
        }

        setEnabled(this._ui[4], true);
        return { message: "Voxelised successfully" };//, style: ToastStyle.Success };
    }

    private _export(): ReturnStatus {
        console.log(this._ui[4].components[0]);
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
            return { message: "Output cancelled" };//, style: ToastStyle.Success };
        }

        try {
            exporter.export(filePath);
        } catch (err: unknown) {
            return { error: err, message: "Failed to export" };//, style: ToastStyle.Failure };
        }

        return { message: "Successfully exported" };//, style: ToastStyle.Success };
    }

    public draw() {
        Renderer.Get.draw();
    }
}