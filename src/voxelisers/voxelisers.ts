import { IVoxeliser } from './base-voxeliser';
import { BVHRayVoxeliser } from './bvh-ray-voxeliser';
import { NormalCorrectedRayVoxeliser } from './normal-corrected-ray-voxeliser';
import { RayVoxeliser } from './ray-voxeliser';
import { ASSERT } from '../util/error_util';

export type TVoxelisers = 'bvh-ray' | 'ncrb' | 'ray-based';

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
