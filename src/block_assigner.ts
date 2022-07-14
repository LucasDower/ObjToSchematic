import { BlockAtlas, BlockInfo } from './block_atlas';
import { RGBA } from './colour';
import { ASSERT, ColourSpace } from './util';
import { Vector3 } from './vector';

export type TBlockAssigners = 'basic' | 'ordered-dithering' | 'random-dithering';

export class BlockAssignerFactory {
    public static GetAssigner(blockAssigner: TBlockAssigners): IBlockAssigner {
        switch (blockAssigner) {
            case 'basic':
                return new BasicBlockAssigner();
            case 'ordered-dithering':
                return new OrderedDitheringBlockAssigner();
            case 'random-dithering':
                return new RandomDitheringBlockAssigner();
            default:
                ASSERT(false, 'Unreachable');
        }
    }
}

interface IBlockAssigner {
    assignBlock(voxelColour: RGBA, voxelPosition: Vector3, colourSpace: ColourSpace, exclude?: string[]): BlockInfo;
}

export class BasicBlockAssigner implements IBlockAssigner {
    assignBlock(voxelColour: RGBA, voxelPosition: Vector3, colourSpace: ColourSpace, exclude?: string[]): BlockInfo {
        return BlockAtlas.Get.getBlock(voxelColour, colourSpace, exclude);
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

    assignBlock(voxelColour: RGBA, voxelPosition: Vector3, colourSpace: ColourSpace, exclude?: string[]): BlockInfo {
        const size = OrderedDitheringBlockAssigner._size;
        const map = this._getThresholdValue(
            Math.abs(voxelPosition.x % size),
            Math.abs(voxelPosition.y % size),
            Math.abs(voxelPosition.z % size),
        );

        const newVoxelColour: RGBA = {
            r: ((255 * voxelColour.r) + map * OrderedDitheringBlockAssigner._threshold) / 255,
            g: ((255 * voxelColour.g) + map * OrderedDitheringBlockAssigner._threshold) / 255,
            b: ((255 * voxelColour.b) + map * OrderedDitheringBlockAssigner._threshold) / 255,
            a: ((255 * voxelColour.a) + map * OrderedDitheringBlockAssigner._threshold) / 255,
        };

        return BlockAtlas.Get.getBlock(newVoxelColour, colourSpace, exclude);
    }
}

export class RandomDitheringBlockAssigner implements IBlockAssigner {
    /** 4x4x4 */
    private static _size = 4;
    private static _threshold = 256 / 8;

    private _mapMatrix = [
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
        const size = RandomDitheringBlockAssigner._size;
        ASSERT(0 <= x && x < size && 0 <= y && y < size && 0 <= z && z < size);
        const index = (x + (size * y) + (size * size * z));
        ASSERT(0 <= index && index < size * size * size);
        return (this._mapMatrix[index] / (size * size * size)) - 0.5;
    }

    assignBlock(voxelColour: RGB, voxelPosition: Vector3, colourSpace: ColourSpace, exclude?: string[]): BlockInfo {
        this._mapMatrix = this._mapMatrix
            .map((value) => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value);

        const size = RandomDitheringBlockAssigner._size;
        const map = this._getThresholdValue(
            Math.abs(voxelPosition.x % size),
            Math.abs(voxelPosition.y % size),
            Math.abs(voxelPosition.z % size),
        );

        const newVoxelColour = new RGB(
            ((255 * voxelColour.r) + map * RandomDitheringBlockAssigner._threshold) / 255,
            ((255 * voxelColour.g) + map * RandomDitheringBlockAssigner._threshold) / 255,
            ((255 * voxelColour.b) + map * RandomDitheringBlockAssigner._threshold) / 255,
        );

        return BlockAtlas.Get.getBlock(newVoxelColour, colourSpace, exclude);
    }
}
