import { Atlas } from './atlas';
import { BlockMesh } from './block_mesh';
import { BufferGenerator } from './buffer';
import { EAppEvent, EventManager } from './event';
import { IExporter } from './exporters/base_exporter';
import { ExporterFactory } from './exporters/exporters';
import { ObjImporter } from './importers/obj_importer';
import { Mesh } from './mesh';
import { ASSERT } from './util/error_util';
import { Logger } from './util/log_util';
import { VoxelMesh } from './voxel_mesh';
import { IVoxeliser } from './voxelisers/base-voxeliser';
import { VoxeliserFactory } from './voxelisers/voxelisers';
import { AssignParams, ExportParams, ImportParams, InitParams, RenderBlockMeshParams, RenderMeshParams, RenderVoxelMeshParams, SetMaterialsParams, TFromWorkerMessage, VoxeliseParams } from './worker_types';

export class WorkerClient {
    private static _instance: WorkerClient;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        Logger.Get.enableLogToFile();
        Logger.Get.initLogFile('worker');
    }

    private _loadedMesh?: Mesh;
    private _loadedVoxelMesh?: VoxelMesh;
    private _loadedBlockMesh?: BlockMesh;

    /**
     * This function should only be called if the client is using the worker.
     */
    public init(params: InitParams.Input): InitParams.Output {
        EventManager.Get.add(EAppEvent.onTaskStart, (e: any) => {
            const message: TFromWorkerMessage = {
                action: 'Progress',
                payload: {
                    type: 'Started',
                    taskId: e[0],
                },
            };
            postMessage(message);
        });

        EventManager.Get.add(EAppEvent.onTaskProgress, (e: any) => {
            const message: TFromWorkerMessage = {
                action: 'Progress',
                payload: {
                    type: 'Progress',
                    taskId: e[0],
                    percentage: e[1],
                },
            };
            postMessage(message);
        });

        EventManager.Get.add(EAppEvent.onTaskEnd, (e: any) => {
            const message: TFromWorkerMessage = {
                action: 'Progress',
                payload: {
                    type: 'Finished',
                    taskId: e[0],
                },
            };
            postMessage(message);
        });

        return {};
    }

    public import(params: ImportParams.Input): ImportParams.Output {
        const importer = new ObjImporter();
        importer.parseFile(params.filepath);
        this._loadedMesh = importer.toMesh();
        this._loadedMesh.processMesh();

        return {
            triangleCount: this._loadedMesh.getTriangleCount(),
            materials: this._loadedMesh.getMaterials(),
        };
    }

    public setMaterials(params: SetMaterialsParams.Input): SetMaterialsParams.Output {
        ASSERT(this._loadedMesh !== undefined);

        this._loadedMesh.setMaterials(params.materials);

        return {
            materials: this._loadedMesh.getMaterials(),
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
        };
    }

    public renderVoxelMesh(params: RenderVoxelMeshParams.Input): RenderVoxelMeshParams.Output {
        ASSERT(this._loadedVoxelMesh !== undefined);

        this._loadedVoxelMesh.setRenderParams(params);

        return {
            buffer: this._loadedVoxelMesh.getBuffer(),
            dimensions: this._loadedVoxelMesh.getBounds().getDimensions(),
            voxelSize: 8.0 / params.desiredHeight,
        };
    }

    public assign(params: AssignParams.Input): AssignParams.Output {
        ASSERT(this._loadedVoxelMesh !== undefined);

        this._loadedBlockMesh = BlockMesh.createFromVoxelMesh(this._loadedVoxelMesh, params);

        return {
        };
    }

    public renderBlockMesh(params: RenderBlockMeshParams.Input): RenderBlockMeshParams.Output {
        ASSERT(this._loadedBlockMesh !== undefined);

        const atlas = Atlas.load(params.textureAtlas);
        ASSERT(atlas !== undefined);

        return {
            buffer: this._loadedBlockMesh.getBuffer(),
            dimensions: this._loadedBlockMesh.getVoxelMesh().getBounds().getDimensions(),
            atlasTexturePath: atlas.getAtlasTexturePath(),
            atlasSize: atlas.getAtlasSize(),
        };
    }

    public export(params: ExportParams.Input): ExportParams.Output {
        ASSERT(this._loadedBlockMesh !== undefined);

        const exporter: IExporter = ExporterFactory.GetExporter(params.exporter);
        const fileExtension = '.' + exporter.getFileExtension();
        if (!params.filepath.endsWith(fileExtension)) {
            params.filepath += fileExtension;
        }
        exporter.export(this._loadedBlockMesh, params.filepath);

        return {
        };
    }
}
