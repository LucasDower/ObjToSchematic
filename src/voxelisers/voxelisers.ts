import { ASSERT } from '../util/error_util';
import { IVoxeliser } from './base-voxeliser';
import { BVHRayVoxeliser } from './bvh-ray-voxeliser';
import { BVHRayVoxeliserThick } from './bvh-ray-thick'
import { NormalCorrectedRayVoxeliser } from './normal-corrected-ray-voxeliser';
import { RayVoxeliser } from './ray-voxeliser';

export type TVoxelisers = 'bvh-ray' | 'ncrb' | 'ray-based' | 'bvh-ray-thick';

export class VoxeliserFactory {
    public static GetVoxeliser(voxeliser: TVoxelisers): IVoxeliser {
        switch (voxeliser) {
            case 'bvh-ray':
                return new BVHRayVoxeliser();
            case 'ncrb':
                return new NormalCorrectedRayVoxeliser();
            case 'ray-based':
                return new RayVoxeliser();
            case 'bvh-ray-thick':
                return new BVHRayVoxeliserThick()
            default:
                ASSERT(false, 'Unreachable');
        }
    }
}
