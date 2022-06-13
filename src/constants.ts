export namespace AppConstants {
    export const FACES_PER_VOXEL = 6;
    export const VERTICES_PER_FACE = 4;
    export const INDICES_PER_VOXEL = 24;
    export const COMPONENT_PER_SIZE_OFFSET = FACES_PER_VOXEL * VERTICES_PER_FACE;

    export namespace ComponentSize {
        export const TEXCOORD = 2;
        export const POSITION = 3;
        export const COLOUR = 3;
        export const NORMAL = 3;
        export const INDICES = 3;
        export const OCCLUSION = 4;
    }
    
    export namespace VoxelMeshBufferComponentOffsets {
        export const TEXCOORD = ComponentSize.TEXCOORD * COMPONENT_PER_SIZE_OFFSET;
        export const POSITION = ComponentSize.POSITION * COMPONENT_PER_SIZE_OFFSET;
        export const COLOUR = ComponentSize.COLOUR * COMPONENT_PER_SIZE_OFFSET;
        export const NORMAL = ComponentSize.NORMAL * COMPONENT_PER_SIZE_OFFSET;
        export const INDICES = 36;
        export const OCCLUSION = ComponentSize.OCCLUSION * COMPONENT_PER_SIZE_OFFSET;
    }
}
