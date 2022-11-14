import { Atlas, TAtlasBlock } from './atlas';
import { RGBA, RGBA_255, RGBAUtil } from './colour';
import { AppMath } from './math';
import { Palette } from './palette';
import { AppTypes, TOptional } from './util';
import { ASSERT } from './util/error_util';

export type TBlockCollection = {
    blocks: Map<AppTypes.TNamespacedBlockName, TAtlasBlock>,
    cache: Map<BigInt, TAtlasBlock>,
}

/* eslint-disable */
export enum EFaceVisibility {
    Up = 1 << 0,
    Down = 1 << 1,
    North = 1 << 2,
    East = 1 << 3,
    South = 1 << 4,
    West = 1 << 5,
}
/* eslint-enable */

/**
 * A new instance of AtlasPalette is created each time
 * a new voxel mesh is voxelised.
 */
export class AtlasPalette {
    private _atlas: Atlas;
    private _palette: Palette;

    public constructor(atlas: Atlas, palette: Palette) {
        this._atlas = atlas;
        this._palette = palette;

        this._palette.removeMissingAtlasBlocks(this._atlas);
    }

    public createBlockCollection(blocksToExclude: AppTypes.TNamespacedBlockName[]): TBlockCollection {
        const blocksNamesToUse = this._palette.getBlocks();
        {
            // Remove excluded blocks
            for (const blockToExclude of blocksToExclude) {
                const index = blocksNamesToUse.indexOf(blockToExclude);
                if (index != -1) {
                    blocksNamesToUse.splice(index, 1);
                }
            }
        }

        const blocksToUse: TBlockCollection = {
            blocks: new Map(),
            cache: new Map(),
        };

        const atlasBlocks = this._atlas.getBlocks();
        {
            // Only add block data for blocks in the palette
            atlasBlocks.forEach((atlasBlock, blockName) => {
                if (blocksNamesToUse.includes(blockName)) {
                    blocksToUse.blocks.set(blockName, atlasBlock);
                }
            });
        }

        ASSERT(blocksToUse.blocks.size >= 1, 'Must have at least one block cached');
        return blocksToUse;
    }

    /**
     * Convert a colour into a Minecraft block.
     * @param colour The colour that the returned block should match with.
     * @param resolution The colour accuracy, a uint8 from 1 to 255, inclusive.
     * @param blockToExclude A list of blocks that should not be used, this should be a subset of the palette blocks.
     * @returns
     */
    public getBlock(colour: RGBA_255, blockCollection: TBlockCollection, faceVisibility: EFaceVisibility, errorWeight: number) {
        const colourHash = RGBAUtil.hash255(colour);
        const contextHash: BigInt = (BigInt(colourHash) << BigInt(6)) + BigInt(faceVisibility);

        // If we've already calculated the block associated with this colour, return it.
        const cachedBlock = blockCollection.cache.get(contextHash);
        if (cachedBlock !== undefined) {
            return cachedBlock;
        }

        // Find closest block in colour
        let minError = Infinity;
        let blockChoice: TOptional<TAtlasBlock>;
        {
            blockCollection.blocks.forEach((blockData) => {
                const context = AtlasPalette.getContextualFaceAverage(blockData, faceVisibility);
                const contextualBlockColour = faceVisibility !== 0 ? context.colour : blockData.colour;
                const contextualStd = faceVisibility !== 0 ? context.std : 0.0;
                const floatColour = RGBAUtil.fromRGBA255(colour);
                const rgbError = RGBAUtil.squaredDistance(floatColour, contextualBlockColour);
                const stdError = contextualStd;
                const totalError = AppMath.lerp(errorWeight, rgbError, stdError);
                if (totalError < minError) {
                    minError = totalError;
                    blockChoice = blockData;
                }
            });
        }

        if (blockChoice !== undefined) {
            blockCollection.cache.set(contextHash, blockChoice);
            return blockChoice;
        }

        ASSERT(false, 'Unreachable, always at least one possible block');
    }

    public static getContextualFaceAverage(block: TAtlasBlock, faceVisibility: EFaceVisibility) {
        const averageColour: RGBA = { r: 0, g: 0, b: 0, a: 0 };
        let averageStd: number = 0.0; // Taking the average of a std is a bit naughty
        let count = 0;
        if (faceVisibility & EFaceVisibility.Up) {
            RGBAUtil.add(averageColour, block.faces.up.colour);
            averageStd += block.faces.up.std;
            ++count;
        }
        if (faceVisibility & EFaceVisibility.Down) {
            RGBAUtil.add(averageColour, block.faces.down.colour);
            averageStd += block.faces.down.std;
            ++count;
        }
        if (faceVisibility & EFaceVisibility.North) {
            RGBAUtil.add(averageColour, block.faces.north.colour);
            averageStd += block.faces.north.std;
            ++count;
        }
        if (faceVisibility & EFaceVisibility.East) {
            RGBAUtil.add(averageColour, block.faces.east.colour);
            averageStd += block.faces.east.std;
            ++count;
        }
        if (faceVisibility & EFaceVisibility.South) {
            RGBAUtil.add(averageColour, block.faces.south.colour);
            averageStd += block.faces.south.std;
            ++count;
        }
        if (faceVisibility & EFaceVisibility.West) {
            RGBAUtil.add(averageColour, block.faces.west.colour);
            averageStd += block.faces.west.std;
            ++count;
        }
        averageColour.r /= count;
        averageColour.g /= count;
        averageColour.b /= count;
        averageColour.a /= count;
        return {
            colour: averageColour,
            std: averageStd / count,
        };
    }
}
