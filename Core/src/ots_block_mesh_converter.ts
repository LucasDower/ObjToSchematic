import { OtS_ReplaceMode, OtS_VoxelMesh } from './ots_voxel_mesh';
import { TAxis } from './util/type_util';
import { Vector3 } from './vector';
import { Triangle } from './triangle';
import { LinearAllocator } from './linear_allocator';
import { Axes, Ray, rayIntersectTriangle } from './ray';
import { Bounds } from './bounds';
import { RGBA, RGBAColours, RGBAUtil } from './colour';
import { OtS_Mesh, OtS_Triangle } from './ots_mesh';
import { UV } from './util';
import { OtS_BlockMesh } from './ots_block_mesh';
import { BlockMesh } from './block_mesh';

export type OtS_BlockMesh_ConverterConfig = {
}

export class OtS_BlockMesh_Converter {
    private _config: OtS_BlockMesh_ConverterConfig;

    public constructor() {
        this._config = {
        };
    }

    /**
     * Attempts to set the config.
     * Returns false if the supplied config is invalid.
     */
    public setConfig(config: OtS_BlockMesh_ConverterConfig): boolean {
        // TODO: Validate

        // TODO: Copy config

        this._config = config;
        return true;
    }

    public process(voxelMesh: OtS_VoxelMesh): OtS_BlockMesh {
        const blockMesh = new OtS_BlockMesh();

        for (const { position } of voxelMesh.getVoxels()) {
            blockMesh.addBlock(position.x, position.y, position.z, 'minecraft:stone', true);
        }

        return blockMesh;
    }
}