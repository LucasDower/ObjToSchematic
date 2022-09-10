import { RenderBuffer } from "./render_buffer";
import { GeometryTemplates } from "./geometry";
import { ObjImporter } from "./importers/obj_importer";
import { MaterialType, Mesh, SolidMaterial, TexturedMaterial } from "./mesh";
import { ASSERT } from "./util/error_util";
import { AssignParams, ImportParams, RenderBlockMeshParams, RenderMeshParams, RenderVoxelMeshParams, VoxeliseParams } from "./worker_types";
import { BufferGenerator, TVoxelMeshBuffer } from "./buffer";
import { TVoxelisers, VoxeliserFactory } from "./voxelisers/voxelisers";
import { param } from "jquery";
import { IVoxeliser } from "./voxelisers/base-voxeliser";
import { TIME_END, TIME_START } from "./util/log_util";
import { VoxelMesh } from "./voxel_mesh";
import { BlockMesh } from "./block_mesh";
import { Atlas } from "./atlas";

export class WorkerClient {
    private static _instance: WorkerClient;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private _loadedMesh?: Mesh;
    private _loadedVoxelMesh?: VoxelMesh;
    private _loadedBlockMesh?: BlockMesh;

    private _voxelMeshBuffer?: TVoxelMeshBuffer;

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

        return {
        }
    }

    public renderVoxelMesh(params: RenderVoxelMeshParams.Input): RenderVoxelMeshParams.Output {
        ASSERT(this._loadedVoxelMesh !== undefined);

        const buffer = BufferGenerator.fromVoxelMesh(this._loadedVoxelMesh, params);
        this._voxelMeshBuffer = buffer.buffer;

        return {
            buffer: buffer,
            dimensions: this._loadedVoxelMesh.getBounds().getDimensions(),
            voxelSize: 8.0 / params.desiredHeight,
        };
    }

    public assign(params: AssignParams.Input): AssignParams.Output {
        ASSERT(this._loadedVoxelMesh !== undefined);
    
        this._loadedBlockMesh = BlockMesh.createFromVoxelMesh(this._loadedVoxelMesh, params);

        return {
        }
    }

    public renderBlockMesh(params: RenderBlockMeshParams.Input): RenderBlockMeshParams.Output {
        ASSERT(this._loadedBlockMesh !== undefined);
        ASSERT(this._voxelMeshBuffer !== undefined);

        const atlas = Atlas.load(params.textureAtlas);
        ASSERT(atlas !== undefined);

        return {
            buffer: BufferGenerator.fromBlockMesh(this._loadedBlockMesh, this._voxelMeshBuffer),
            dimensions: this._loadedBlockMesh.getVoxelMesh().getBounds().getDimensions(),
            atlasTexturePath: atlas.getAtlasTexturePath(),
            atlasSize: atlas.getAtlasSize(),
        };
    }
}