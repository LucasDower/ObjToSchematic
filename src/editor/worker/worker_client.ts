import path from 'path';

import { Atlas } from '../../runtime/atlas';
import { BlockMesh } from '../../runtime/block_mesh';
import { BufferGenerator } from '../../runtime/buffer';
import { EAppEvent, EventManager } from '../event';
import { IExporter } from '../../runtime/exporters/base_exporter';
import { ExporterFactory } from '../../runtime/exporters/exporters';
import { ImporterFactor } from '../../runtime/importers/importers';
import { Localiser } from '../localiser';
import { Mesh } from '../../runtime/mesh';
import { ProgressManager, TTaskHandle } from '../progress';
import { ASSERT } from '../../runtime/util/error_util';
import { VoxelMesh } from '../../runtime/voxel_mesh';
import { IVoxeliser } from '../../runtime/voxelisers/base-voxeliser';
import { VoxeliserFactory } from '../../runtime/voxelisers/voxelisers';
import { AssignParams, ExportParams, ImportParams, InitParams, RenderMeshParams, RenderNextBlockMeshChunkParams, RenderNextVoxelMeshChunkParams, SetMaterialsParams, SettingsParams, TFromWorkerMessage, VoxeliseParams } from './worker_types';

export class WorkerClient {
    private static _instance: WorkerClient;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
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

        // TODO: Async: should await
        Localiser.Get.init();

        return {};
    }

    public async settings(params: SettingsParams.Input): Promise<SettingsParams.Output> {
        await Localiser.Get.changeLanguage(params.language);

        return {};
    }

    public async import(params: ImportParams.Input): Promise<ImportParams.Output> {
        const parsed = path.parse(params.file.name);

        const importer = ImporterFactor.GetImporter(parsed.ext === '.obj' ? 'obj' : 'gltf');
        this._loadedMesh = await importer.import(params.file);

        this._loadedMesh.processMesh(params.rotation.y, params.rotation.x, params.rotation.z);

        return {
            triangleCount: this._loadedMesh.getTriangleCount(),
            dimensions: this._loadedMesh.getBounds().getDimensions(),
            materials: this._loadedMesh.getMaterials(),
        };
    }

    public setMaterials(params: SetMaterialsParams.Input): SetMaterialsParams.Output {
        ASSERT(this._loadedMesh !== undefined);

        this._loadedMesh.setMaterials(params.materials);

        return {
            materials: this._loadedMesh.getMaterials(),
            materialsChanged: Array.from(params.materials.keys()), // TODO: Change to actual materials changed
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

        const handle = ProgressManager.Get.start('Voxelising');
        {
            this._loadedVoxelMesh = voxeliser.voxelise(this._loadedMesh, params, (percentage) => {
                ProgressManager.Get.progress(handle, percentage);
            });
        }
        ProgressManager.Get.end(handle);

        this._loadedVoxelMesh.calculateNeighbours();

        this._voxelMeshChunkIndex = 0;

        return {
        };
    }

    private _voxelMeshChunkIndex = 0;
    private _voxelMeshProgressHandle?: TTaskHandle;
    public renderChunkedVoxelMesh(params: RenderNextVoxelMeshChunkParams.Input): RenderNextVoxelMeshChunkParams.Output {
        ASSERT(this._loadedVoxelMesh !== undefined);

        const isFirstChunk = this._voxelMeshChunkIndex === 0;
        if (isFirstChunk) {
            this._voxelMeshProgressHandle = ProgressManager.Get.start('VoxelMeshBuffer');
            this._loadedVoxelMesh.setRenderParams(params);
        }

        const buffer = this._loadedVoxelMesh.getChunkedBuffer(this._voxelMeshChunkIndex);
        ++this._voxelMeshChunkIndex;

        if (this._voxelMeshProgressHandle !== undefined) {
            if (buffer.moreVoxelsToBuffer) {
                ProgressManager.Get.progress(this._voxelMeshProgressHandle, buffer.progress);
            } else {
                ProgressManager.Get.end(this._voxelMeshProgressHandle);
                this._voxelMeshProgressHandle = undefined;
            }
        }

        return {
            buffer: buffer,
            dimensions: this._loadedVoxelMesh.getBounds().getDimensions(),
            voxelSize: 1.0 / params.desiredHeight,
            moreVoxelsToBuffer: buffer.moreVoxelsToBuffer,
            isFirstChunk: isFirstChunk,
        };
    }

    public assign(params: AssignParams.Input): AssignParams.Output {
        ASSERT(this._loadedVoxelMesh !== undefined);

        this._loadedBlockMesh = BlockMesh.createFromVoxelMesh(this._loadedVoxelMesh, params);

        this._blockMeshChunkIndex = 0;

        return {
        };
    }

    private _blockMeshChunkIndex = 0;
    //private _blockMeshProgressHandle?: TTaskHandle;
    public renderChunkedBlockMesh(params: RenderNextBlockMeshChunkParams.Input): RenderNextBlockMeshChunkParams.Output {
        ASSERT(this._loadedBlockMesh !== undefined);

        const isFirstChunk = this._blockMeshChunkIndex === 0;
        if (isFirstChunk) {
            //this._blockMeshProgressHandle = ProgressManager.Get.start('BlockMeshBuffer');
        }

        const buffer = this._loadedBlockMesh.getChunkedBuffer(this._blockMeshChunkIndex);
        ++this._blockMeshChunkIndex;

        /*
        if (this._blockMeshProgressHandle !== undefined) {
            if (buffer.moreBlocksToBuffer) {
                ProgressManager.Get.progress(this._blockMeshProgressHandle, buffer.progress);
            } else {
                ProgressManager.Get.end(this._blockMeshProgressHandle);
                this._blockMeshProgressHandle = undefined;
            }
        }
        */

        const atlas = Atlas.load(params.textureAtlas);
        ASSERT(atlas !== undefined);

        return {
            buffer: buffer,
            bounds: this._loadedBlockMesh.getVoxelMesh().getBounds(),
            atlasTexturePath: atlas.getAtlasTexturePath(),
            atlasSize: atlas.getAtlasSize(),
            moreBlocksToBuffer: buffer.moreBlocksToBuffer,
            isFirstChunk: isFirstChunk,
        };
    }

    /*
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
    */

    public export(params: ExportParams.Input): ExportParams.Output {
        ASSERT(this._loadedBlockMesh !== undefined);

        const exporter: IExporter = ExporterFactory.GetExporter(params.exporter);
        const files = exporter.export(this._loadedBlockMesh);

        return {
            files: files,
        };
    }
}
