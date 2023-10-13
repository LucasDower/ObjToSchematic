import { BlockMesh } from '../../../Core/src/block_mesh';
import { BufferGenerator } from '../renderer/buffer_mesh';
import { EAppEvent, EventManager } from '../event';
import { IExporter } from '../../../Core/src/exporters/base_exporter';
import { ExporterFactory } from '../../../Core/src/exporters/exporters';
import { OtS_ImporterFactory } from '../../../Core/src/importers/importers';
import { LOC, Localiser } from '../localiser';
import { ProgressManager, TTaskHandle } from '../progress';
import { ASSERT } from '../../../Core/src/util/error_util';
import { AssignParams, ExportParams, ImportParams, InitParams, RenderMeshParams, RenderNextBlockMeshChunkParams, RenderNextVoxelMeshChunkParams, SetMaterialsParams, SettingsParams, TFromWorkerMessage, VoxeliseParams } from './worker_types';
import { StatusHandler } from '../status';
import { BufferGenerator_VoxelMesh } from '../renderer/buffer_voxel_mesh';
import { BufferGenerator_BlockMesh } from '../renderer/buffer_block_mesh';
import { OtS_VoxelMesh } from '../../../Core/src/ots_voxel_mesh';
import { OtS_VoxelMesh_Converter } from '../../../Core/src/ots_voxel_mesh_converter';
import { OtS_Mesh } from '../../../Core/src/ots_mesh';
import { OtS_Texture } from '../../../Core/src/ots_texture';

export class WorkerClient {
    private static _instance: WorkerClient;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
    }

    private _originalLoadedMesh?: OtS_Mesh;
    private _loadedMesh?: OtS_Mesh;
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
        //const parsed = path.parse(params.file.name);
        const extension = params.file.name.split('.').findLast(() => true);

        const importer = OtS_ImporterFactory.GetImporter(extension === 'obj' ? 'obj' : 'gltf');
        this._loadedMesh = await importer.import(params.file.stream());

        this._loadedMesh.centre();
        this._loadedMesh.rotate(params.rotation.y, params.rotation.x, params.rotation.z);
        this._loadedMesh.normalise();

        this._originalLoadedMesh = this._loadedMesh.copy();

        return {
            triangleCount: this._loadedMesh.calcTriangleCount(),
            dimensions: this._loadedMesh.calcBounds().getDimensions(),
            //materials: this._loadedMesh.getMaterials(),
            originalMetadata: this._originalLoadedMesh.getSectionMetadata(),
            sectionMetadata: this._loadedMesh.getSectionMetadata(),
        };
    }

    public setMaterials(params: SetMaterialsParams.Input): SetMaterialsParams.Output {
        ASSERT(this._originalLoadedMesh !== undefined);

        // Updating materials will now be handled by creating a new empty mesh
        // and adding the mesh sections from the original imported mesh
        const newMesh = OtS_Mesh.create();

        this._originalLoadedMesh.getSectionData().forEach((originalSection) => {
            const index = params.sectionMetadata.findIndex((entry) => { return entry.name === originalSection.name });
            if (index === -1) {
                // This section has no metadata assigned to it, remove the section from the mesh (don't add it)
                return;
            }

            const newMetadata = params.sectionMetadata[index];

            // Sanity check the new metadata is compatible with the original mesh with ASSERTs
            // This should already have been verified by the UI before the data was sent to the worker
            switch (newMetadata.type) {
                case 'solid':
                    // The solid material can be assigned to any mesh section
                    newMesh.addSection({
                        name: originalSection.name,
                        type: 'solid',
                        indexData: originalSection.indexData,
                        positionData: originalSection.positionData,
                        normalData: originalSection.normalData,
                        colour: newMetadata.colour,
                    });
                    break;
                case 'colour':
                    // The colour material can only be used if the original mesh used the colour material
                    // i.e. there exists per-vertex colour data
                    ASSERT(originalSection.type === 'colour');
                    newMesh.addSection({
                        name: originalSection.name,
                        type: 'colour',
                        indexData: originalSection.indexData,
                        positionData: originalSection.positionData,
                        normalData: originalSection.normalData,
                        colourData: originalSection.colourData,
                    });
                    break;
                case 'textured':
                    // The textured material can only be used if the original mesh used the textured material
                    // i.e. there exists per-vertex texcoord data
                    ASSERT(originalSection.type === 'textured');
                    newMesh.addSection({
                        name: originalSection.name,
                        type: 'textured',
                        indexData: originalSection.indexData,
                        positionData: originalSection.positionData,
                        texcoordData: originalSection.texcoordData,
                        normalData: originalSection.normalData,
                        texture: newMetadata.texture,
                    });
                    break;
            }
        });

        this._loadedMesh = newMesh;



        /*
        for (const material of params.materials) {
            if (material.type === 'textured') {
                Object.setPrototypeOf(material.texture, OtS_Texture.prototype);
            }
            const success = this._loadedMesh.setMaterial(material);
            // TODO: Do something with success
        }
        */

        return {
            materials: this._loadedMesh.getSectionMetadata(),
            //materials: this._loadedMesh.getMaterials(),
            //materialsChanged: params.materials.map((material) => material.name), // TODO: Change to actual materials changed
        };
    }

    public renderMesh(params: RenderMeshParams.Input): RenderMeshParams.Output {
        ASSERT(this._loadedMesh !== undefined);

        return {
            buffers: BufferGenerator.fromMesh(this._loadedMesh),
            dimensions: this._loadedMesh.calcBounds().getDimensions(),
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
