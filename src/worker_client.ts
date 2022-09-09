//import { BlockMesh } from "./block_mesh";
//import { Mesh } from "./mesh";
//import { VoxelMesh } from "./voxel_mesh";
import { ImportParams } from "./worker_types";
//import { ObjImporter } from "./importers/obj_importer";
//import { isMainThread } from 'worker_threads';

export class WorkerClient {
    private static _instance: WorkerClient;
    public static get Get() {
        //ASSERT(!isMainThread, 'Worker function called from main thread');
        return this._instance || (this._instance = new this());
    }

    //private _loadedMesh?: Mesh;
    //private _loadedVoxelMesh?: VoxelMesh;
    //private _loadedBlockMesh?: BlockMesh;

    public import(params: ImportParams.Input): ImportParams.Output {
        /*
        const importer = new ObjImporter();
        importer.parseFile(params.filepath);
        this._loadedMesh = importer.toMesh();
        this._loadedMesh.processMesh();

        return {
            triangleCount: this._loadedMesh.getTriangleCount(),
        };
        */

        return { triangleCount: 0 };
    }
}