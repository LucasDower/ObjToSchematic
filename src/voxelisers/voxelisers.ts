import { IVoxeliser } from './base-voxeliser';
import { BVHRayVoxeliser } from './bvh-ray-voxeliser';
import { NormalCorrectedRayVoxeliser } from './normal-corrected-ray-voxeliser';
import { RayVoxeliser } from './ray-voxeliser';
import { ASSERT } from '../util';
import { TextureFiltering } from '../texture';
import { VoxelMeshParams } from '../voxel_mesh';

export type TVoxelisers = 'bvh-ray' | 'ncrb' | 'ray-based';

/** These are the parameters required by voxelisers */
export type VoxeliseParams = VoxelMeshParams & {
    desiredHeight: number,
    useMultisampleColouring: boolean,
    textureFiltering: TextureFiltering,
    enableAmbientOcclusion: boolean,
}

export class VoxeliserFactory {
    public static GetVoxeliser(voxeliser: TVoxelisers): IVoxeliser {
        switch (voxeliser) {
            case 'bvh-ray':
                return new BVHRayVoxeliser();
            case 'ncrb':
                return new NormalCorrectedRayVoxeliser();
            case 'ray-based':
                return new RayVoxeliser();
            default:
                ASSERT(false, 'Unreachable');
        }
    }
}
