import path from 'path';

import { BlockMesh } from '../../runtime/block_mesh';
import { BufferGenerator } from '../buffer';
import { EAppEvent, EventManager } from '../event';
import { IExporter } from '../../runtime/exporters/base_exporter';
import { ExporterFactory } from '../../runtime/exporters/exporters';
import { ImporterFactor } from '../../runtime/importers/importers';
import { LOC, Localiser } from '../localiser';
import { Mesh } from '../../runtime/mesh';
import { ProgressManager, TTaskHandle } from '../progress';
import { ASSERT } from '../../runtime/util/error_util';
import { AssignParams, ExportParams, ImportParams, InitParams, RenderMeshParams, RenderNextBlockMeshChunkParams, RenderNextVoxelMeshChunkParams, SetMaterialsParams, SettingsParams, TFromWorkerMessage, VoxeliseParams } from './worker_types';
import { StatusHandler } from '../status';
import { BufferGenerator_VoxelMesh } from '../renderer/buffer_voxel_mesh';
import { BufferGenerator_BlockMesh } from '../renderer/buffer_block_mesh';
import { AppError } from '../util/editor_util';
import { OtS_VoxelMesh } from '../../runtime/ots_voxel_mesh';
import { OtS_VoxelMesh_Converter } from '../../runtime/ots_voxel_mesh_converter';

export class WorkerClient {
    private static _instance: WorkerClient;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
    }

    private _loadedMesh?: Mesh;
    private _loadedVoxelMesh?: OtS_VoxelMesh;
    private _loadedBlockMesh?: BlockMesh;

    private _voxelMeshProgressHandle?: TTaskHandle;
    private _bufferGenerator_VoxelMesh?: BufferGenerator_VoxelMesh;

    private _blockMeshProgressHandle?: TTaskHandle;
    private _bufferGenerator_BlockMesh?: BufferGenerator_BlockMesh;

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

        const fileBuffer = await params.file.arrayBuffer();

        this._loadedMesh = await importer.import(fileBuffer);

        const err = this._loadedMesh.processMesh(params.rotation.y, params.rotation.x, params.rotation.z);
        if (err !== null) {
            switch (err) {
                case 'could-not-normalise':
                    throw new AppError(LOC('import.could_not_scale_mesh'));
                case 'no-triangles-loaded':
                    throw new AppError(LOC('import.no_triangles_loaded'));
                case 'no-vertices-loaded':
                    throw new AppError(LOC('import.no_vertices_loaded'));
                default:
                    throw new AppError(LOC('import.could_not_parse'));
            }
        }

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
        this._bufferGenerator_VoxelMesh = undefined;

        const converter = new OtS_VoxelMesh_Converter();
        converter.setConfig({
            constraintAxis: params.constraintAxis,
            size: params.size,
            multisampling: params.useMultisampleColouring,
            replaceMode: params.voxelOverlapRule,
        });

        this._loadedVoxelMesh = converter.process(this._loadedMesh);

        // Report stats
        {
            StatusHandler.info(LOC('voxelise.voxel_count', { count: this._loadedVoxelMesh.getVoxelCount() }));

            const dim = this._loadedVoxelMesh.getBounds().getDimensions().add(1);
            StatusHandler.info(LOC('voxelise.voxel_mesh_dimensions', { x: dim.x, y: dim.y, z: dim.z }));
        }

        return {
        };
    }

    public renderChunkedVoxelMesh(params: RenderNextVoxelMeshChunkParams.Input): RenderNextVoxelMeshChunkParams.Output {
        ASSERT(this._loadedVoxelMesh !== undefined);

        const isFirstChunk = this._bufferGenerator_VoxelMesh === undefined;
        if (isFirstChunk) {
            this._voxelMeshProgressHandle = ProgressManager.Get.start('VoxelMeshBuffer');
            this._bufferGenerator_VoxelMesh = new BufferGenerator_VoxelMesh(this._loadedVoxelMesh, params.enableAmbientOcclusion);
        }

        ASSERT(this._bufferGenerator_VoxelMesh !== undefined, 'No buffer generator for voxel mesh');
        ASSERT(this._voxelMeshProgressHandle !== undefined, 'No progress handle for voxel mesh');

        const buffer = this._bufferGenerator_VoxelMesh.getNext();

        if (buffer.moreVoxelsToBuffer) {
            ProgressManager.Get.progress(this._voxelMeshProgressHandle, buffer.progress);
        } else {
            ProgressManager.Get.end(this._voxelMeshProgressHandle);
            this._voxelMeshProgressHandle = undefined;
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
        this._bufferGenerator_BlockMesh = undefined;

        const result = BlockMesh.createFromVoxelMesh(this._loadedVoxelMesh, params);
        this._loadedBlockMesh = result.blockMesh;

        if (result.warnings) {
            switch (result.warnings.type) {
                case 'falling-blocks':
                    StatusHandler.warning(LOC('assign.falling_blocks', result.warnings.count));
                    break;
            }
        }

        return {
        };
    }

    public renderChunkedBlockMesh(params: RenderNextBlockMeshChunkParams.Input): RenderNextBlockMeshChunkParams.Output {
        ASSERT(this._loadedBlockMesh !== undefined, 'No block mesh loaded for chunk renderer');
        ASSERT(this._bufferGenerator_VoxelMesh !== undefined, 'No voxel mesh buffer generator for block mesh chunk renderer');

        const isFirstChunk = this._bufferGenerator_BlockMesh === undefined;
        if (isFirstChunk) {
            this._blockMeshProgressHandle = ProgressManager.Get.start('VoxelMeshBuffer');
            this._bufferGenerator_BlockMesh = new BufferGenerator_BlockMesh(this._loadedBlockMesh, this._bufferGenerator_VoxelMesh);
        }

        ASSERT(this._bufferGenerator_BlockMesh !== undefined, 'No buffer generator for block mesh');
        ASSERT(this._blockMeshProgressHandle !== undefined, 'No progress handle for block mesh');

        const buffer = this._bufferGenerator_BlockMesh.getNext();

        if (buffer.moreBlocksToBuffer) {
            ProgressManager.Get.progress(this._blockMeshProgressHandle, buffer.progress);
        } else {
            ProgressManager.Get.end(this._blockMeshProgressHandle);
            this._blockMeshProgressHandle = undefined;
        }

        return {
            buffer: buffer,
            bounds: this._loadedBlockMesh.getVoxelMesh().getBounds(),
            moreBlocksToBuffer: buffer.moreBlocksToBuffer,
            isFirstChunk: isFirstChunk,
        };
    }

    public export(params: ExportParams.Input): ExportParams.Output {
        ASSERT(this._loadedBlockMesh !== undefined);

        const exporter: IExporter = ExporterFactory.GetExporter(params.exporter);
        const files = exporter.export(this._loadedBlockMesh);

        return {
            files: files,
        };
    }
}
