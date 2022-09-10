import { TMeshBufferDescription, TVoxelMeshBuffer, TVoxelMeshBufferDescription } from "./buffer"
import { StatusMessage } from "./status"
import { TextureFiltering } from "./texture"
import { AppError } from "./util/error_util"
import { Vector3 } from "./vector"
import { TVoxelisers } from "./voxelisers/voxelisers"
import { TVoxelOverlapRule } from "./voxel_mesh"

export namespace ImportParams {
    export type Input = {
        filepath: string,
    }

    export type Output = {
        triangleCount: number,
    }
}

export namespace RenderMeshParams {
    export type Input = {

    }

    export type Output = {
        buffers: TMeshBufferDescription[],
        dimensions: Vector3
    }
}

export namespace VoxeliseParams {
    export type Input =  {
        voxeliser: TVoxelisers,
        desiredHeight: number,
        useMultisampleColouring: boolean,
        textureFiltering: TextureFiltering,
        enableAmbientOcclusion: boolean,
        voxelOverlapRule: TVoxelOverlapRule,
        calculateNeighbours: boolean,
    }

    export type Output = {

    }
}

export namespace RenderVoxelMeshParams {
    export type Input = {
        desiredHeight: number,
        enableAmbientOcclusion: boolean,
    }

    export type Output = {
        buffer: TVoxelMeshBufferDescription,
        dimensions: Vector3,
        voxelSize: number,
    }
}

export namespace AssignParams {
    export type Input = {

    }

    export type Output = {

    }
}

export namespace RenderBlockMeshParams {
    export type Input = {

    }

    export type Output = {

    }
}

export namespace ExportParams {
    export type Input = {

    }

    export type Output = {

    }
}

export type TStatus = {
    statusMessages: StatusMessage[],
}

export type TToWorkerMessage =
    | { action: 'Import',           params: ImportParams.Input }
    | { action: 'RenderMesh',       params: RenderMeshParams.Input }
    | { action: 'Voxelise',         params: VoxeliseParams.Input }
    | { action: 'RenderVoxelMesh',  params: RenderVoxelMeshParams.Input }
    | { action: 'Assign',           params: AssignParams.Input }
    | { action: 'RenderBlockMesh',  params: RenderBlockMeshParams.Input }
    | { action: 'Export',           params: ExportParams.Input }

export type TFromWorkerMessage = 
    | { action: 'KnownError', error: AppError }
    | { action: 'UnknownError', error: Error }
    | (TStatus & ( 
        | { action: 'Import',           result: ImportParams.Output }
        | { action: 'RenderMesh',       result: RenderMeshParams.Output }
        | { action: 'Voxelise',         result: VoxeliseParams.Output }
        | { action: 'RenderVoxelMesh',  result: RenderVoxelMeshParams.Output }
        | { action: 'Assign',           result: AssignParams.Output }
        | { action: 'RenderBlockMesh',  result: RenderBlockMeshParams.Output }
        | { action: 'Export',           result: ExportParams.Output } ));