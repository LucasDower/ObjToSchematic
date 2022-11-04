import { Atlas, TAtlasBlock } from './atlas';
import { RGBA, RGBA_255, RGBAUtil } from './colour';
import { Palette } from './palette';
import { AppTypes, TOptional } from './util';
import { ASSERT } from './util/error_util';

export type TBlockCollection = {
    blocks: Map<AppTypes.TNamespacedBlockName, TAtlasBlock>,
    cache: Map<number, TAtlasBlock>,
}

export enum EFaceVisibility {
    Up = 1 << 0,
    Down = 1 << 1,
    North = 1 << 2,
    East = 1 << 3,
    South = 1 << 4,
    West = 1 << 5,
}

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
    public getBlock(colour: RGBA_255, blockCollection: TBlockCollection, faceVisibility: EFaceVisibility) {
        const contextHash = (RGBAUtil.hash255(colour) << 6) | faceVisibility;

        // If we've already calculated the block associated with this colour, return it.
        const cachedBlock = blockCollection.cache.get(contextHash);
        if (cachedBlock !== undefined) {
            return cachedBlock;
        }

        // Find closest block in colour
        let minDistance = Infinity;
        let blockChoice: TOptional<TAtlasBlock>;
        {
            blockCollection.blocks.forEach((blockData) => {
                const contextualBlockColour = faceVisibility !== 0 ?
                    AtlasPalette.getContextualFaceAverage(blockData, faceVisibility) :
                    blockData.colour;
                const colourDistance = RGBAUtil.squaredDistance(RGBAUtil.fromRGBA255(colour), contextualBlockColour);
                if (colourDistance < minDistance) {
                    minDistance = colourDistance;
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
        const average: RGBA = { r: 0, g: 0, b: 0, a: 0 };
        let count = 0;
        if (faceVisibility & EFaceVisibility.Up) {
            RGBAUtil.add(average, block.faces.up.colour);
            ++count;
        }
        if (faceVisibility & EFaceVisibility.Down) {
            RGBAUtil.add(average, block.faces.down.colour);
            ++count;
        }
        if (faceVisibility & EFaceVisibility.North) {
            RGBAUtil.add(average, block.faces.north.colour);
            ++count;
        }
        if (faceVisibility & EFaceVisibility.East) {
            RGBAUtil.add(average, block.faces.east.colour);
            ++count;
        }
        if (faceVisibility & EFaceVisibility.South) {
            RGBAUtil.add(average, block.faces.south.colour);
            ++count;
        }
        if (faceVisibility & EFaceVisibility.West) {
            RGBAUtil.add(average, block.faces.west.colour);
            ++count;
        }
        average.r /= count;
        average.g /= count;
        average.b /= count;
        average.a /= count;
        return average;
    }
}
