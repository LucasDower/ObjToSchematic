import fs from 'fs';

import { Atlas, TAtlasBlock } from './atlas';
import { AtlasPalette, EFaceVisibility } from './block_assigner';
import { BlockInfo } from './block_atlas';
import { ChunkedBufferGenerator, TBlockMeshBufferDescription } from './buffer';
import { RGBA_255, RGBAUtil } from './colour';
import { Ditherer } from './dither';
import { BlockMeshLighting } from './lighting';
import { Palette } from './palette';
import { ProgressManager } from './progress';
import { StatusHandler } from './status';
import { ColourSpace, TOptional } from './util';
import { AppError, ASSERT } from './util/error_util';
import { LOGF } from './util/log_util';
import { AppPaths, PathUtil } from './util/path_util';
import { Vector3 } from './vector';
import { Voxel, VoxelMesh } from './voxel_mesh';
import { AssignParams } from './worker_types';

interface Block {
    voxel: Voxel;
    blockInfo: BlockInfo;
}

interface GrassLikeBlock {
    id: number;
    voxelColour: RGBA_255;
    errWeight: number;
    faceVisibility: EFaceVisibility;
}

export type FallableBehaviour = 'replace-falling' | 'replace-fallable' | 'place-string' | 'do-nothing';

export interface BlockMeshParams {
    textureAtlas: Atlas,
    blockPalette: Palette,
    colourSpace: ColourSpace,
    fallable: FallableBehaviour,
}

export class BlockMesh {
    private _blocksUsed: Set<string>;
    private _blocks: Block[];
    private _voxelMesh: VoxelMesh;
    private _fallableBlocks: string[];
    private _transparentBlocks: string[];
    private _grassLikeBlocks: string[];
    private _emissiveBlocks: string[];
    private _atlas: Atlas;
    private _lighting: BlockMeshLighting;

    public static createFromVoxelMesh(voxelMesh: VoxelMesh, blockMeshParams: AssignParams.Input) {
        const blockMesh = new BlockMesh(voxelMesh);
        blockMesh._assignBlocks(blockMeshParams);

        //blockMesh._calculateLighting(blockMeshParams.lightThreshold);
        if (blockMeshParams.calculateLighting) {
            blockMesh._lighting.init();
            blockMesh._lighting.addSunLightValues();
            blockMesh._lighting.addEmissiveBlocks();
            blockMesh._lighting.addLightToDarkness(blockMeshParams.lightThreshold);
            blockMesh._lighting.dumpInfo();
        }

        return blockMesh;
    }

    private constructor(voxelMesh: VoxelMesh) {
        this._blocksUsed = new Set();
        this._blocks = [];
        this._voxelMesh = voxelMesh;
        this._atlas = Atlas.getVanillaAtlas()!;
        this._lighting = new BlockMeshLighting(this);
        //this._lighting = new Map<string, number>();
        //this._recreateBuffer = true;

        const fallableBlocksString = fs.readFileSync(PathUtil.join(AppPaths.Get.resources, 'fallable_blocks.json'), 'utf-8');
        this._fallableBlocks = JSON.parse(fallableBlocksString).fallable_blocks;

        const transparentlocksString = fs.readFileSync(PathUtil.join(AppPaths.Get.resources, 'transparent_blocks.json'), 'utf-8');
        this._transparentBlocks = JSON.parse(transparentlocksString).transparent_blocks;

        const emissivelocksString = fs.readFileSync(PathUtil.join(AppPaths.Get.resources, 'emissive_blocks.json'), 'utf-8');
        this._emissiveBlocks = JSON.parse(emissivelocksString).emissive_blocks;

        const grassLikeBlocksString = fs.readFileSync(PathUtil.join(AppPaths.Get.resources, 'grass_like_blocks.json'), 'utf-8');
        this._grassLikeBlocks = JSON.parse(grassLikeBlocksString).grass_like_blocks;
    }

    /**
     * Before we turn a voxel into a block we have the opportunity to alter the voxel's colour.
     * This is where the colour accuracy bands colours together and where dithering is calculated.
     */
    private _getFinalVoxelColour(voxel: Voxel, blockMeshParams: AssignParams.Input) {
        const voxelColour = RGBAUtil.copy(voxel.colour);

        const binnedColour = RGBAUtil.bin(voxelColour, blockMeshParams.resolution);

        const ditheredColour: RGBA_255 = RGBAUtil.copy255(binnedColour);
        switch (blockMeshParams.dithering) {
            case 'off': {
                break;
            }
            case 'random': {
                Ditherer.ditherRandom(ditheredColour);
                break;
            }
            case 'ordered': {
                Ditherer.ditherOrdered(ditheredColour, voxel.position);
                break;
            }
        }

        return ditheredColour;
    }

    private _assignBlocks(blockMeshParams: AssignParams.Input) {
        const atlas = Atlas.load(blockMeshParams.textureAtlas);
        ASSERT(atlas !== undefined, 'Could not load atlas');
        this._atlas = atlas;

        const palette = Palette.load(blockMeshParams.blockPalette);
        ASSERT(palette !== undefined, 'Could not load palette');

        const atlasPalette = new AtlasPalette(atlas, palette);
        const allBlockCollection = atlasPalette.createBlockCollection([]);
        const nonFallableBlockCollection = atlasPalette.createBlockCollection(this._fallableBlocks);
        const grassLikeBlocksBuffer: GrassLikeBlock[] = [];

        let countFalling = 0;
        const taskHandle = ProgressManager.Get.start('Assigning');
        const voxels = this._voxelMesh.getVoxels();
        for (let voxelIndex = 0; voxelIndex < voxels.length; ++voxelIndex) {
            ProgressManager.Get.progress(taskHandle, voxelIndex / voxels.length);

            // Convert the voxel into a block
            const voxel = voxels[voxelIndex];
            const voxelColour = this._getFinalVoxelColour(voxel, blockMeshParams);
            const faceVisibility = blockMeshParams.contextualAveraging ?
                this._voxelMesh.getFaceVisibility(voxel.position) :
                VoxelMesh.getFullFaceVisibility();
            let block = atlasPalette.getBlock(voxelColour, allBlockCollection, faceVisibility, blockMeshParams.errorWeight);

            // Check that this block meets the fallable behaviour, we may need
            // to choose a different block if the current one doesn't meet the requirements
            const isBlockFallable = this._fallableBlocks.includes(block.name);
            const isBlockSupported = this._voxelMesh.isVoxelAt(Vector3.add(voxel.position, new Vector3(0, -1, 0)));

            if (isBlockFallable && !isBlockSupported) {
                ++countFalling;
            }

            const shouldReplaceBlock =
                (blockMeshParams.fallable === 'replace-fallable' && isBlockFallable) ||
                (blockMeshParams.fallable === 'replace-falling' && isBlockFallable && !isBlockSupported);

            if (shouldReplaceBlock) {
                block = atlasPalette.getBlock(voxelColour, nonFallableBlockCollection, faceVisibility, blockMeshParams.errorWeight);
            }

            if (this._grassLikeBlocks.includes(block.name)) {
                grassLikeBlocksBuffer.push({
                    id: this._blocks.length,
                    voxelColour: voxelColour,
                    errWeight: blockMeshParams.errorWeight,
                    faceVisibility: faceVisibility,
                });
            }

            this._blocks.push({
                voxel: voxel,
                blockInfo: block,
            });
            this._blocksUsed.add(block.name);
        }

        if (grassLikeBlocksBuffer.length > 0) {
            const nonGrassLikeBlockCollection = atlasPalette.createBlockCollection(this._grassLikeBlocks);
            for (let index=0; index < grassLikeBlocksBuffer.length; index++) {
                ProgressManager.Get.progress(taskHandle, index / grassLikeBlocksBuffer.length);
                const examined = grassLikeBlocksBuffer[index];
                const examinedBlock = this._blocks[examined.id];
                const topBlockId = this._blocks.findIndex((b) => b.voxel.position.equals(Vector3.add(examinedBlock.voxel.position, new Vector3(0, 1, 0))));
                if (topBlockId > -1 && !this._transparentBlocks.includes(this._blocks[topBlockId].blockInfo.name)) {
                    const block = atlasPalette.getBlock(examined.voxelColour, nonGrassLikeBlockCollection, examined.faceVisibility, examined.errWeight);
                    examinedBlock.blockInfo = block;
                    this._blocks[examined.id] = examinedBlock;
                    this._blocksUsed.add(block.name);
                };
            }
        }
        ProgressManager.Get.end(taskHandle);

        if (blockMeshParams.fallable === 'do-nothing' && countFalling > 0) {
            StatusHandler.Get.add('warning', `${countFalling.toLocaleString()} blocks will fall under gravity when this structure is placed`);
        }
    }

    // Face order: ['north', 'south', 'up', 'down', 'east', 'west']
    public getBlockLighting(position: Vector3) {
        // TODO: Shouldn't only use sunlight value, take max of either
        return [
            this._lighting.getMaxLightLevel(new Vector3(1, 0, 0).add(position)),
            this._lighting.getMaxLightLevel(new Vector3(-1, 0, 0).add(position)),
            this._lighting.getMaxLightLevel(new Vector3(0, 1, 0).add(position)),
            this._lighting.getMaxLightLevel(new Vector3(0, -1, 0).add(position)),
            this._lighting.getMaxLightLevel(new Vector3(0, 0, 1).add(position)),
            this._lighting.getMaxLightLevel(new Vector3(0, 0, -1).add(position)),
        ];
    }

    public setEmissiveBlock(pos: Vector3): boolean {
        const voxel = this._voxelMesh.getVoxelAt(pos);
        ASSERT(voxel !== undefined, 'Missing voxel');
        const minError = Infinity;
        let bestBlock: TAtlasBlock | undefined;
        this._emissiveBlocks.forEach((emissiveBlockName) => {
            const emissiveBlockData = this._atlas.getBlocks().get(emissiveBlockName);
            if (emissiveBlockData) {
                const error = RGBAUtil.squaredDistance(emissiveBlockData.colour, voxel.colour);
                if (error < minError) {
                    bestBlock = emissiveBlockData;
                }
            }
        });

        if (bestBlock !== undefined) {
            const blockIndex = this._voxelMesh.getVoxelIndex(pos);
            ASSERT(blockIndex !== undefined, 'Setting emissive block of block that doesn\'t exist');
            this._blocks[blockIndex].blockInfo = bestBlock;

            return true;
        }

        throw new AppError('Block palette contains no light blocks to place');
    }

    public getBlockAt(pos: Vector3): TOptional<Block> {
        const index = this._voxelMesh.getVoxelIndex(pos);
        if (index !== undefined) {
            return this._blocks[index];
        }
    }

    public getBlocks(): Block[] {
        return this._blocks;
    }

    public getBlockPalette() {
        return Array.from(this._blocksUsed);
    }

    public getVoxelMesh() {
        if (!this._voxelMesh) {
            throw new AppError('Could not get voxel mesh');
        }
        return this._voxelMesh;
    }

    public getAtlas() {
        return this._atlas;
    }

    public isEmissiveBlock(block: Block) {
        return this._emissiveBlocks.includes(block.blockInfo.name);
    }

    public isTransparentBlock(block: Block) {
        return this._transparentBlocks.includes(block.blockInfo.name);
    }

    /*
    private _buffer?: TBlockMeshBufferDescription;
    public getBuffer(): TBlockMeshBufferDescription {
        //ASSERT(this._renderParams, 'Called BlockMesh.getBuffer() without setting render params');
        if (this._buffer === undefined) {
            this._buffer = BufferGenerator.fromBlockMesh(this);
            //this._recreateBuffer = false;
        }
        return this._buffer;
    }
    */

    private _bufferChunks: Array<TBlockMeshBufferDescription & { moreBlocksToBuffer: boolean, progress: number }> = [];
    public getChunkedBuffer(chunkIndex: number): TBlockMeshBufferDescription & { moreBlocksToBuffer: boolean, progress: number } {
        if (this._bufferChunks[chunkIndex] === undefined) {
            LOGF(`[BlockMesh]: getChunkedBuffer: ci: ${chunkIndex} not cached`);
            this._bufferChunks[chunkIndex] = ChunkedBufferGenerator.fromBlockMesh(this, chunkIndex);
        } else {
            LOGF(`[BlockMesh]: getChunkedBuffer: ci: ${chunkIndex} not cached`);
        }
        return this._bufferChunks[chunkIndex];
    }

    public getAllChunkedBuffers() {
        return this._bufferChunks;
    }
}
