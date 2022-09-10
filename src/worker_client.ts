import { RenderBuffer } from "./render_buffer";
import { GeometryTemplates } from "./geometry";
import { ObjImporter } from "./importers/obj_importer";
import { MaterialType, Mesh, SolidMaterial, TexturedMaterial } from "./mesh";
import { ASSERT } from "./util/error_util";
import { ImportParams, RenderMeshParams, RenderVoxelMeshParams, VoxeliseParams } from "./worker_types";
import { BufferGenerator } from "./buffer";
import { TVoxelisers, VoxeliserFactory } from "./voxelisers/voxelisers";
import { param } from "jquery";
import { IVoxeliser } from "./voxelisers/base-voxeliser";
import { TIME_END, TIME_START } from "./util/log_util";
import { VoxelMesh } from "./voxel_mesh";

export class WorkerClient {
    private static _instance: WorkerClient;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private _loadedMesh?: Mesh;
    private _loadedVoxelMesh?: VoxelMesh;

    public import(params: ImportParams.Input): ImportParams.Output {
        const importer = new ObjImporter();
        importer.parseFile(params.filepath);
        this._loadedMesh = importer.toMesh();
        this._loadedMesh.processMesh();

        return {
            triangleCount: this._loadedMesh.getTriangleCount(),
        };
    }

    public renderMesh(params: RenderMeshParams.Input): RenderMeshParams.Output {
        ASSERT(this._loadedMesh !== undefined);

        return {
            buffers: BufferGenerator.fromMesh(this._loadedMesh),
            dimensions: this._loadedMesh.getBounds().getDimensions(),
        };
    }

    public voxelise(params: VoxeliseParams.Input): VoxeliseParams.Output {
        ASSERT(this._loadedMesh !== undefined);
        
        const voxeliser: IVoxeliser = VoxeliserFactory.GetVoxeliser(params.voxeliser);
        this._loadedVoxelMesh = voxeliser.voxelise(this._loadedMesh, params);
        /*
        TIME_START('Render Voxel Mesh');
        {
            const voxelSize = 8.0 / params.desiredHeight;
            Renderer.Get.useVoxelMesh(this._loadedVoxelMesh, voxelSize, params.enableAmbientOcclusion);
        }
        TIME_END('Render Voxel Mesh');
        */
        return {

        }
    }

    public renderVoxelMesh(params: RenderVoxelMeshParams.Input): RenderVoxelMeshParams.Output {
        ASSERT(this._loadedVoxelMesh !== undefined);

        return {
            buffer: BufferGenerator.fromVoxelMesh(this._loadedVoxelMesh, params),
            dimensions: this._loadedVoxelMesh.getBounds().getDimensions(),
            voxelSize: 8.0 / params.desiredHeight,
        };
    }
}