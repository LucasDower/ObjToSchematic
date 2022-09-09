import { TMeshBufferDescription } from "./buffer"
import { StatusMessage } from "./status"
import { AppError } from "./util/error_util"
import { Vector3 } from "./vector"

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
    export type Input = {

    }

    export type Output = {

    }
}

export namespace RenderVoxelMeshParams {
    export type Input = {

    }

    export type Output = {

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