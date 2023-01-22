
import fs from 'fs';

import { AppTypes } from './util';
import { AppPaths, PathUtil } from './util/path_util';

export namespace AppConstants {
    export const FACES_PER_VOXEL = 6;
    export const VERTICES_PER_FACE = 4;
    export const INDICES_PER_VOXEL = 24;
    export const COMPONENT_PER_SIZE_OFFSET = FACES_PER_VOXEL * VERTICES_PER_FACE;

    export namespace ComponentSize {
        export const LIGHTING = 1;
        export const TEXCOORD = 2;
        export const POSITION = 3;
        export const COLOUR = 4;
        export const NORMAL = 3;
        export const INDICES = 3;
        export const OCCLUSION = 4;
    }

    export namespace VoxelMeshBufferComponentOffsets {
        export const LIGHTING = ComponentSize.LIGHTING * COMPONENT_PER_SIZE_OFFSET;
        export const TEXCOORD = ComponentSize.TEXCOORD * COMPONENT_PER_SIZE_OFFSET;
        export const POSITION = ComponentSize.POSITION * COMPONENT_PER_SIZE_OFFSET;
        export const COLOUR = ComponentSize.COLOUR * COMPONENT_PER_SIZE_OFFSET;
        export const NORMAL = ComponentSize.NORMAL * COMPONENT_PER_SIZE_OFFSET;
        export const INDICES = 36;
        export const OCCLUSION = ComponentSize.OCCLUSION * COMPONENT_PER_SIZE_OFFSET;
    }

    export const DATA_VERSION = 3105; // 1.19
}

export class AppRuntimeConstants {
    /* Singleton */
    private static _instance: AppRuntimeConstants;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    public readonly FALLABLE_BLOCKS: AppTypes.TNamespacedBlockName[];
    public readonly TRANSPARENT_BLOCKS: AppTypes.TNamespacedBlockName[];
    public readonly GRASS_LIKE_BLOCKS: AppTypes.TNamespacedBlockName[];
    public readonly EMISSIVE_BLOCKS: AppTypes.TNamespacedBlockName[];

    private constructor() {
        const fallableBlocksString = fs.readFileSync(PathUtil.join(AppPaths.Get.resources, 'fallable_blocks.json'), 'utf-8');
        this.FALLABLE_BLOCKS = JSON.parse(fallableBlocksString).fallable_blocks;

        const transparentBlocksString = fs.readFileSync(PathUtil.join(AppPaths.Get.resources, 'transparent_blocks.json'), 'utf-8');
        this.TRANSPARENT_BLOCKS = JSON.parse(transparentBlocksString).transparent_blocks;

        const emissiveBlocksString = fs.readFileSync(PathUtil.join(AppPaths.Get.resources, 'emissive_blocks.json'), 'utf-8');
        this.GRASS_LIKE_BLOCKS = JSON.parse(emissiveBlocksString).emissive_blocks;

        const grassLikeBlocksString = fs.readFileSync(PathUtil.join(AppPaths.Get.resources, 'grass_like_blocks.json'), 'utf-8');
        this.EMISSIVE_BLOCKS = JSON.parse(grassLikeBlocksString).grass_like_blocks;
    }
}
