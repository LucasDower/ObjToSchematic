import { Atlas, TAtlasBlock } from './atlas';
import { RGBA, RGBA_255, RGBAUtil } from './colour';
import { Palette } from './palette';
import { AppTypes, TOptional } from './util';
import { ASSERT } from './util/error_util';

export type TBlockCollection = {
    blocks: Map<AppTypes.TNamespacedBlockName, TAtlasBlock>,
    cache: Map<number, TAtlasBlock>,
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
    public getBlock(colour: RGBA_255, blockCollection: TBlockCollection) {
        const colourHash = RGBAUtil.hash255(colour);

        // If we've already calculated the block associated with this colour, return it.
        const cachedBlock = blockCollection.cache.get(colourHash);
        if (cachedBlock !== undefined) {
            return cachedBlock;
        }

        // Find closest block in colour
        let minDistance = Infinity;
        let blockChoice: TOptional<TAtlasBlock>;
        {
            blockCollection.blocks.forEach((blockData) => {
                const colourDistance = RGBAUtil.squaredDistance(RGBAUtil.fromRGBA255(colour), blockData.colour);
                if (colourDistance < minDistance) {
                    minDistance = colourDistance;
                    blockChoice = blockData;
                }
            });
        }

        if (blockChoice !== undefined) {
            blockCollection.cache.set(colourHash, blockChoice);
            return blockChoice;
        }

        ASSERT(false, 'Unreachable, always at least one possible block');
    }
}
