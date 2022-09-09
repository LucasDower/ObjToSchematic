import { RenderBuffer } from "./render_buffer";
import { GeometryTemplates } from "./geometry";
import { ObjImporter } from "./importers/obj_importer";
import { MaterialType, Mesh, SolidMaterial, TexturedMaterial } from "./mesh";
import { ASSERT } from "./util/error_util";
import { ImportParams, RenderMeshParams } from "./worker_types";
import { BufferGenerator } from "./buffer";

export class WorkerClient {
    private static _instance: WorkerClient;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private _loadedMesh?: Mesh;

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
            buffers: BufferGenerator.fromMesh(this._loadedMesh) 
        };
    }
}