import { Atlas, TAtlasBlock } from '../../Editor/src/atlas';
import { AtlasPalette } from './block_assigner';
import { BlockInfo } from './block_atlas';
import { RGBA_255, RGBAUtil } from './colour';
import { AppRuntimeConstants } from './constants';
import { Ditherer } from './dither';
import { BlockMeshLighting } from './lighting';
import { TOptional } from './util';
import { ASSERT } from './util/error_util';
import { Vector3 } from './vector';
import { BlockPalette, TDithering } from './util/type_util';
import { OtS_Voxel, OtS_VoxelMesh } from './ots_voxel_mesh';
import { OtS_FaceVisibility, OtS_VoxelMesh_Neighbourhood } from './ots_voxel_mesh_neighbourhood';

export interface Block {
    voxel: OtS_Voxel;
    blockInfo: BlockInfo;
}

interface GrassLikeBlock {
    hash: number;
    voxelColour: RGBA_255;
    errWeight: number;
    faceVisibility: OtS_FaceVisibility;
}

export type FallableBehaviour = 'replace-falling' | 'replace-fallable' | 'place-string' | 'do-nothing';

export interface BlockMeshParams {
    blockPalette: BlockPalette,
    dithering: TDithering,
    ditheringMagnitude: number,
    fallable: FallableBehaviour,
    resolution: RGBAUtil.TColourAccuracy,
    calculateLighting: boolean,
    lightThreshold: number,
    contextualAveraging: boolean,
    errorWeight: number,
    atlasJSON: any,
}

export type TAssignBlocksWarning =
    | { type: 'falling-blocks', count: number };

export class BlockMesh {
    private _blocksUsed: Set<string>;
    private _blocks: Map<number, Block>;
    private _voxelMesh: OtS_VoxelMesh;
    private _lighting: BlockMeshLighting;
    private _atlas?: Atlas;

    public static createFromVoxelMesh(voxelMesh: OtS_VoxelMesh, blockMeshParams: BlockMeshParams) {
        const blockMesh = new BlockMesh(voxelMesh);

        const atlas = Atlas.load(blockMeshParams.atlasJSON);
        blockMesh.setAtlas(atlas);

        const warn = blockMesh._assignBlocks(blockMeshParams);

        //blockMesh._calculateLighting(blockMeshParams.lightThreshold);
        if (blockMeshParams.calculateLighting) {
            blockMesh._lighting.init();
            blockMesh._lighting.addSunLightValues();
            blockMesh._lighting.addEmissiveBlocks();
            blockMesh._lighting.addLightToDarkness(blockMeshParams.lightThreshold);
            blockMesh._lighting.dumpInfo();
        }

        return { blockMesh: blockMesh, warnings: warn };
    }

    private constructor(voxelMesh: OtS_VoxelMesh) {
        this._blocksUsed = new Set();
        this._blocks = new Map();
        this._voxelMesh = voxelMesh;
        this._lighting = new BlockMeshLighting(this);
    }

    public setAtlas(atlas: Atlas) {
        this._atlas = atlas;
    }

    /**
     * Before we turn a voxel into a block we have the opportunity to alter the voxel's colour.
     * This is where the colour accuracy bands colours together and where dithering is calculated.
     */
    private _getFinalVoxelColour(voxel: OtS_Voxel, blockMeshParams: BlockMeshParams) {
        const voxelColour = RGBAUtil.copy(voxel.colour);

        const binnedColour = RGBAUtil.bin(voxelColour, blockMeshParams.resolution);

        const ditheredColour: RGBA_255 = RGBAUtil.copy255(binnedColour);
        switch (blockMeshParams.dithering) {
            case 'off': {
                break;
            }
            case 'random': {
                Ditherer.ditherRandom(ditheredColour, blockMeshParams.ditheringMagnitude);
                break;
            }
            case 'ordered': {
                Ditherer.ditherOrdered(ditheredColour, voxel.position, blockMeshParams.ditheringMagnitude);
                break;
            }
        }

        return ditheredColour;
    }

    private _assignBlocks(blockMeshParams: BlockMeshParams): (null | TAssignBlocksWarning) {
        ASSERT(this._atlas !== undefined, 'No atlas loaded');

        const atlasPalette = new AtlasPalette(this._atlas, blockMeshParams.blockPalette);
        const allBlockCollection = atlasPalette.createBlockCollection([]);
        const nonFallableBlockCollection = atlasPalette.createBlockCollection(Array.from(AppRuntimeConstants.Get.FALLABLE_BLOCKS));
        const grassLikeBlocksBuffer: GrassLikeBlock[] = [];

        const faceVisibilityCache = new OtS_VoxelMesh_Neighbourhood();
        faceVisibilityCache.process(this._voxelMesh, 'cardinal');

        let countFalling = 0;
        // TODO: ProgressRework
        //const taskHandle = ProgressManager.Get.start('Assigning');
        const voxels = Array.from(this._voxelMesh.getVoxels());
        for (let voxelIndex = 0; voxelIndex < voxels.length; ++voxelIndex) {
            //ProgressManager.Get.progress(taskHandle, voxelIndex / voxels.length);

            // Convert the voxel into a block
            const voxel = voxels[voxelIndex];
            const voxelColour = this._getFinalVoxelColour(voxel, blockMeshParams);
            const faceVisibility = blockMeshParams.contextualAveraging
                ? faceVisibilityCache.getFaceVisibility(voxel.position.x, voxel.position.y, voxel.position.z)
                : OtS_FaceVisibility.Full;
            ASSERT(faceVisibility !== null, 'Neighbourhood cache processed with wrong mode');
            let block = atlasPalette.getBlock(voxelColour, allBlockCollection, faceVisibility, blockMeshParams.errorWeight);

            // Check that this block meets the fallable behaviour, we may need
            // to choose a different block if the current one doesn't meet the requirements
            const isBlockFallable = AppRuntimeConstants.Get.FALLABLE_BLOCKS.has(block.name);
            const isBlockSupported = this._voxelMesh.isVoxelAt(voxel.position.x, voxel.position.y - 1, voxel.position.z);

            if (isBlockFallable && !isBlockSupported) {
                ++countFalling;
            }

            const shouldReplaceBlock =
                (blockMeshParams.fallable === 'replace-fallable' && isBlockFallable) ||
                (blockMeshParams.fallable === 'replace-falling' && isBlockFallable && !isBlockSupported);

            if (shouldReplaceBlock) {
                block = atlasPalette.getBlock(voxelColour, nonFallableBlockCollection, faceVisibility, blockMeshParams.errorWeight);
            }

            if (AppRuntimeConstants.Get.GRASS_LIKE_BLOCKS.has(block.name)) {
                grassLikeBlocksBuffer.push({
                    hash: voxel.position.hash(),
                    voxelColour: voxelColour,
                    errWeight: blockMeshParams.errorWeight,
                    faceVisibility: faceVisibility,
                });
            }

            this._blocks.set(voxel.position.hash(), {
                voxel: voxel,
                blockInfo: block,
            });
            this._blocksUsed.add(block.name);
        }

        if (grassLikeBlocksBuffer.length > 0) {
            const nonGrassLikeBlockCollection = atlasPalette.createBlockCollection(Array.from(AppRuntimeConstants.Get.GRASS_LIKE_BLOCKS));
            for (let index=0; index < grassLikeBlocksBuffer.length; index++) {
                //ProgressManager.Get.progress(taskHandle, index / grassLikeBlocksBuffer.length);
                const examined = grassLikeBlocksBuffer[index];
                const examinedBlock = this._blocks.get(examined.hash);
                ASSERT(examinedBlock, 'Missing examined block');

                const topBlockPosition = Vector3.add(examinedBlock.voxel.position, new Vector3(0, 1, 0));
                const topBlock = this._blocks.get(topBlockPosition.hash());
                if (topBlock !== undefined) {
                    if (!AppRuntimeConstants.Get.TRANSPARENT_BLOCKS.has(topBlock.blockInfo.name)) {
                        const block = atlasPalette.getBlock(examined.voxelColour, nonGrassLikeBlockCollection, examined.faceVisibility, examined.errWeight);
                        examinedBlock.blockInfo = block;
                        this._blocks.set(examined.hash, examinedBlock);
                        this._blocksUsed.add(block.name);
                    }
                }
            }
        }
        //ProgressManager.Get.end(taskHandle);

        if (blockMeshParams.fallable === 'do-nothing' && countFalling > 0) {
            return { type: 'falling-blocks', count: countFalling }
        }

        return null;
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
        ASSERT(this._atlas, 'No atlas loaded');

        const voxel = this._voxelMesh.getVoxelAt(pos.x, pos.y, pos.z);
        ASSERT(voxel !== null, 'Missing voxel');
        const minError = Infinity;
        let bestBlock: TAtlasBlock | undefined;
        AppRuntimeConstants.Get.EMISSIVE_BLOCKS.forEach((emissiveBlockName) => {
            const emissiveBlockData = this._atlas!.getBlocks().get(emissiveBlockName);
            if (emissiveBlockData) {
                const error = RGBAUtil.squaredDistance(emissiveBlockData.colour, voxel.colour);
                if (error < minError) {
                    bestBlock = emissiveBlockData;
                }
            }
        });

        if (bestBlock !== undefined) {
            const blockIndex = 0; //this._voxelMesh.getVoxelIndex(pos);
            ASSERT(blockIndex !== undefined, 'Setting emissive block of block that doesn\'t exist');

            const block = this._blocks.get(pos.hash());
            ASSERT(block !== undefined);

            block.blockInfo = bestBlock;
            return true;
        }

        return false;
    }

    public getBlockAt(pos: Vector3): TOptional<Block> {
        return this._blocks.get(pos.hash());
    }

    public getBlocks(): Block[] {
        return Array.from(this._blocks.values());
    }

    public getBlockPalette() {
        return Array.from(this._blocksUsed);
    }

    public getVoxelMesh() {
        ASSERT(this._voxelMesh !== undefined, 'Block mesh has no voxel mesh');
        return this._voxelMesh;
    }

    public isEmissiveBlock(block: Block) {
        return AppRuntimeConstants.Get.EMISSIVE_BLOCKS.has(block.blockInfo.name);
    }

    public isTransparentBlock(block: Block) {
        return AppRuntimeConstants.Get.TRANSPARENT_BLOCKS.has(block.blockInfo.name);
    }
}
