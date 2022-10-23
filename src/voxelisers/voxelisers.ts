import { ASSERT } from '../util/error_util';
import { IVoxeliser } from './base-voxeliser';
import { BVHRayVoxeliser } from './bvh-ray-voxeliser';
import { BVHRayVoxeliserPlusThickness } from './bvh-ray-voxeliser-plus-thickness'
import { NormalCorrectedRayVoxeliser } from './normal-corrected-ray-voxeliser';
import { RayVoxeliser } from './ray-voxeliser';

export type TVoxelisers = 'bvh-ray' | 'ncrb' | 'ray-based' | 'bvh-ray-plus-thickness';

export class VoxeliserFactory {
    public static GetVoxeliser(voxeliser: TVoxelisers): IVoxeliser {
        switch (voxeliser) {
            case 'bvh-ray':
                return new BVHRayVoxeliser();
            case 'ncrb':
                return new NormalCorrectedRayVoxeliser();
            case 'ray-based':
                return new RayVoxeliser();
            case 'bvh-ray-plus-thickness':
                return new BVHRayVoxeliserPlusThickness()
            default:
                ASSERT(false, 'Unreachable');
        }
    }
}
