import { BlockAtlas, BlockInfo } from './block_atlas';
import { ASSERT, ColourSpace, RGB } from './util';
import { Vector3 } from './vector';

interface IBlockAssigner {
    assignBlock(voxelColour: RGB, voxelPosition: Vector3, colourSpace: ColourSpace): BlockInfo;
}

export class BasicBlockAssigner implements IBlockAssigner {
    assignBlock(voxelColour: RGB, voxelPosition: Vector3, colourSpace: ColourSpace): BlockInfo {
        return BlockAtlas.Get.getBlock(voxelColour, colourSpace);
    }
}

export class OrderedDitheringBlockAssigner implements IBlockAssigner {
    /** 4x4x4 */
    private static _size = 4;
    private static _threshold = 256 / 8;

    private static _mapMatrix = [
        0, 16, 2, 18, 48, 32, 50, 34,
        6, 22, 4, 20, 54, 38, 52, 36,
        24, 40, 26, 42, 8, 56, 10, 58,
        30, 46, 28, 44, 14, 62, 12, 60,
        3, 19, 5, 21, 51, 35, 53, 37,
        1, 17, 7, 23, 49, 33, 55, 39,
        27, 43, 29, 45, 11, 59, 13, 61,
        25, 41, 31, 47, 9, 57, 15, 63,
    ];

    private _getThresholdValue(x: number, y: number, z: number) {
        const size = OrderedDitheringBlockAssigner._size;
        ASSERT(0 <= x && x < size && 0 <= y && y < size && 0 <= z && z < size);
        const index = (x + (size * y) + (size * size * z));
        ASSERT(0 <= index && index < size * size * size);
        return (OrderedDitheringBlockAssigner._mapMatrix[index] / (size * size * size)) - 0.5;
    }

    assignBlock(voxelColour: RGB, voxelPosition: Vector3, colourSpace: ColourSpace): BlockInfo {
        const size = OrderedDitheringBlockAssigner._size;
        const map = this._getThresholdValue(
            Math.abs(voxelPosition.x % size),
            Math.abs(voxelPosition.y % size),
            Math.abs(voxelPosition.z % size),
        );

        const newVoxelColour = new RGB(
            ((255 * voxelColour.r) + map * OrderedDitheringBlockAssigner._threshold) / 255,
            ((255 * voxelColour.g) + map * OrderedDitheringBlockAssigner._threshold) / 255,
            ((255 * voxelColour.b) + map * OrderedDitheringBlockAssigner._threshold) / 255,
        );

        return BlockAtlas.Get.getBlock(newVoxelColour, colourSpace);
    }
}
