import { BlockMeshParams } from '../../../Core/src/block_mesh';
import { Bounds } from '../../../Core/src/bounds';
import { OtS_MeshBuffer } from '../renderer/buffer_mesh';
import { TStructureExport } from '../../../Core/src/exporters/base_exporter';
import { TExporters } from '../../../Core/src/exporters/exporters';
import { TMessage } from '../ui/console';
import { TAxis } from '../../../Core/src/util/type_util';
import { Vector3 } from '../../../Core/src/vector';
import { AppError } from '../util/editor_util';
import { OtS_ReplaceMode } from '../../../Core/src/ots_voxel_mesh';
import { OtS_MeshSectionMetadata } from 'ots-core/src/ots_mesh';
import { TVoxelMeshBufferDescription } from 'src/renderer/buffer_voxel_mesh';
import { TBlockMeshBufferDescription } from 'src/renderer/buffer_block_mesh';

export namespace InitParams {
    export type Input = {
    }

    export type Output = {
    }
}

export namespace SettingsParams {
    export type Input = {
        language: string,
    }

    export type Output = {
    }
}

export namespace ImportParams {
    export type Input = {
        file: File,
        rotation: Vector3,
    }

    export type Output = {
        triangleCount: number,
        dimensions: Vector3,
        originalMetadata: OtS_MeshSectionMetadata[],
        sectionMetadata: OtS_MeshSectionMetadata[],
    }
}

export namespace RenderMeshParams {
    export type Input = {

    }

    export type Output = {
        buffers: OtS_MeshBuffer[],
        dimensions: Vector3,
    }
}

export namespace SetMaterialsParams {
    export type Input = {
        sectionMetadata: OtS_MeshSectionMetadata[],
    }

    export type Output = {
        materials: OtS_MeshSectionMetadata[],
    }
}

export namespace VoxeliseParams {
    export type Input = {
        constraintAxis: TAxis,
        size: number,
        useMultisampleColouring?: number,
        enableAmbientOcclusion: boolean,
        voxelOverlapRule: OtS_ReplaceMode,
    }

    export type Output = {
    }
}

export namespace RenderNextVoxelMeshChunkParams {
    export type Input = {
        desiredHeight: number,
        enableAmbientOcclusion: boolean,
    }

    export type Output = {
        buffer: TVoxelMeshBufferDescription,
        dimensions: Vector3,
        voxelSize: number,
        moreVoxelsToBuffer: boolean,
        isFirstChunk: boolean,
    }
}

export type TAtlasId = string;
export type TPaletteId = string;

export namespace AssignParams {
    export type Input = BlockMeshParams;

    export type Output = {

    }
}

export namespace RenderNextBlockMeshChunkParams {
    export type Input = {
    }

    export type Output = {
        buffer: TBlockMeshBufferDescription,
        bounds: Bounds,
        moreBlocksToBuffer: boolean,
        isFirstChunk: boolean,
    }
}

export namespace ExportParams {
    export type Input = {
        exporter: TExporters,
    }

    export type Output = {
        files: TStructureExport
    }
}

export type TaskParams =
    | { type: 'Started', taskId: string }
    | { type: 'Progress', taskId: string, percentage: number }
    | { type: 'Finished', taskId: string }

export type TToWorkerMessage =
    | { action: 'Init', params: InitParams.Input }
    | { action: 'Settings', params: SettingsParams.Input }
    | { action: 'Import', params: ImportParams.Input }
    | { action: 'SetMaterials', params: SetMaterialsParams.Input }
    | { action: 'RenderMesh', params: RenderMeshParams.Input }
    | { action: 'Voxelise', params: VoxeliseParams.Input }
    | { action: 'RenderNextVoxelMeshChunk', params: RenderNextVoxelMeshChunkParams.Input }
    | { action: 'Assign', params: AssignParams.Input }
    | { action: 'RenderNextBlockMeshChunk', params: RenderNextBlockMeshChunkParams.Input }
    | { action: 'Export', params: ExportParams.Input }

export type TFromWorkerMessage =
    | { action: 'KnownError', error: AppError }
    | { action: 'UnknownError', error: Error }
    | { action: 'Progress', payload: TaskParams }
    | ({ messages: TMessage[] } & (
        | { action: 'Init', result: InitParams.Output }
        | { action: 'Settings', result: SettingsParams.Output }
        | { action: 'Import', result: ImportParams.Output }
        | { action: 'SetMaterials', result: SetMaterialsParams.Output }
        | { action: 'RenderMesh', result: RenderMeshParams.Output }
        | { action: 'Voxelise', result: VoxeliseParams.Output }
        | { action: 'RenderNextVoxelMeshChunk', result: RenderNextVoxelMeshChunkParams.Output }
        | { action: 'Assign', result: AssignParams.Output }
        | { action: 'RenderNextBlockMeshChunk', result: RenderNextBlockMeshChunkParams.Output }
        | { action: 'Export', result: ExportParams.Output }));
