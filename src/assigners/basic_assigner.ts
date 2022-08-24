import { AtlasPalette } from '../block_assigner';
import { BlockInfo } from '../block_atlas';
import { RGBA } from '../colour';
import { ColourSpace } from '../util';
import { Vector3 } from '../vector';
import { IBlockAssigner } from './base_assigner';

export class BasicBlockAssigner implements IBlockAssigner {
    assignBlock(atlasPalette: AtlasPalette, voxelColour: RGBA, voxelPosition: Vector3, colourSpace: ColourSpace, exclude?: string[]): BlockInfo {
        return atlasPalette.getBlock(voxelColour, exclude);
    }
}
