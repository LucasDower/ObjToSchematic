import { AtlasPalette, TBlockCollection } from '../block_assigner';
import { BlockInfo } from '../block_atlas';
import { RGBA, RGBAUtil } from '../colour';
import { ColourSpace } from '../util';
import { Vector3 } from '../vector';
import { IBlockAssigner } from './base_assigner';

export class RandomDitheringBlockAssigner implements IBlockAssigner {
    private static _deviation = 32;

    assignBlock(atlasPalette: AtlasPalette, voxelColour: RGBA, voxelPosition: Vector3, resolution: RGBAUtil.TColourAccuracy, colourSpace: ColourSpace, blockCollection: TBlockCollection): BlockInfo {
        const map = Math.random() - 0.5;

        const newVoxelColour: RGBA = {
            r: ((255 * voxelColour.r) + map * RandomDitheringBlockAssigner._deviation) / 255,
            g: ((255 * voxelColour.g) + map * RandomDitheringBlockAssigner._deviation) / 255,
            b: ((255 * voxelColour.b) + map * RandomDitheringBlockAssigner._deviation) / 255,
            a: ((255 * voxelColour.a) + map * RandomDitheringBlockAssigner._deviation) / 255,
        };

        return atlasPalette.getBlock(newVoxelColour, blockCollection, resolution);
    }
}
