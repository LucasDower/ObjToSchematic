import { AtlasPalette, TBlockCollection } from '../block_assigner';
import { BlockInfo } from '../block_atlas';
import { RGBA, RGBAUtil } from '../colour';
import { ColourSpace } from '../util';
import { Vector3 } from '../vector';
import { IBlockAssigner } from './base_assigner';

export class BasicBlockAssigner implements IBlockAssigner {
    assignBlock(atlasPalette: AtlasPalette, voxelColour: RGBA, voxelPosition: Vector3, resolution: RGBAUtil.TColourAccuracy, colourSpace: ColourSpace, blockCollection: TBlockCollection): BlockInfo {
        return atlasPalette.getBlock(voxelColour, blockCollection, resolution);
    }
}
