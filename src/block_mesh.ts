import fs from 'fs';

import { BlockAssignerFactory, TBlockAssigners } from './assigners/assigners';
import { Atlas, TAtlasBlock } from './atlas';
import { AtlasPalette } from './block_assigner';
import { BlockInfo } from './block_atlas';
import { ChunkedBufferGenerator, TBlockMeshBufferDescription } from './buffer';
import { RGBAUtil } from './colour';
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

export type FallableBehaviour = 'replace-falling' | 'replace-fallable' | 'place-string' | 'do-nothing';

export interface BlockMeshParams {
    textureAtlas: Atlas,
    blockPalette: Palette,
    blockAssigner: TBlockAssigners,
    colourSpace: ColourSpace,
    fallable: FallableBehaviour,
}

export class BlockMesh {
    private _blocksUsed: string[];
    private _blocks: Block[];
    private _voxelMesh: VoxelMesh;
    private _fallableBlocks: string[];
    private _transparentBlocks: string[];
    private _emissiveBlocks: string[];
    private _atlas: Atlas;
    private _lighting: BlockMeshLighting;

    public static createFromVoxelMesh(voxelMesh: VoxelMesh, blockMeshParams: AssignParams.Input) {
        const blockMesh = new BlockMesh(voxelMesh);
        blockMesh._assignBlocks(blockMeshParams);

        //blockMesh._calculateLighting(blockMeshParams.lightThreshold);
        blockMesh._lighting.init();
        blockMesh._lighting.addSunLightValues();
        blockMesh._lighting.addEmissiveBlocks();
        blockMesh._lighting.addLightToDarkness(blockMeshParams.lightThreshold);
        blockMesh._lighting.dumpInfo();

        return blockMesh;
    }

    private constructor(voxelMesh: VoxelMesh) {
        this._blocksUsed = [];
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

        const blockAssigner = BlockAssignerFactory.GetAssigner(blockMeshParams.blockAssigner);

        let countFalling = 0;
        const taskHandle = ProgressManager.Get.start('Assigning');
        const voxels = this._voxelMesh.getVoxels();
        for (let voxelIndex = 0; voxelIndex < voxels.length; ++voxelIndex) {
            ProgressManager.Get.progress(taskHandle, voxelIndex / voxels.length);

            const voxel = voxels[voxelIndex];

            let block = blockAssigner.assignBlock(
                atlasPalette,
                voxel.colour,
                voxel.position,
                blockMeshParams.resolution,
                blockMeshParams.colourSpace,
                allBlockCollection,
            );

            const isFallable = this._fallableBlocks.includes(block.name);
            const isSupported = this._voxelMesh.isVoxelAt(Vector3.add(voxel.position, new Vector3(0, -1, 0)));

            if (isFallable && !isSupported) {
                ++countFalling;
            }

            let shouldReplace = (blockMeshParams.fallable === 'replace-fallable' && isFallable);
            shouldReplace ||= (blockMeshParams.fallable === 'replace-falling' && isFallable && !isSupported);

            if (shouldReplace) {
                const replacedBlock = blockAssigner.assignBlock(
                    atlasPalette,
                    voxel.colour,
                    voxel.position,
                    blockMeshParams.resolution,
                    ColourSpace.RGB,
                    nonFallableBlockCollection,
                );
                block = replacedBlock;
            }

            this._blocks.push({
                voxel: voxel,
                blockInfo: block,
            });
            if (!this._blocksUsed.includes(block.name)) {
                this._blocksUsed.push(block.name);
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
        return this._blocksUsed;
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
