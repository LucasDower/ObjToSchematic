import * as zlib from 'zlib';
import * as fs from 'fs';
import { NBT, TagType, writeUncompressed } from 'prismarine-nbt';
import { Vector3 } from './vector';
import { VoxelManager } from './voxel_manager';
import { Block } from './block_atlas';

export abstract class Exporter {
    protected _sizeVector!: Vector3;

    public abstract convertToNBT(): NBT
    abstract getFormatFilter(): Electron.FileFilter;
    abstract getFormatName(): string;

    getFormatDisclaimer(): string | undefined {
        return;
    }

    export(filePath: string): boolean {
        this._sizeVector = Vector3.sub(VoxelManager.Get.max, VoxelManager.Get.min).addScalar(1);

        const nbt = this.convertToNBT();

        const outBuffer = fs.createWriteStream(filePath);
        const newBuffer = writeUncompressed(nbt, 'big');

        zlib.gzip(newBuffer, (err, buffer) => {
            if (!err) {
                outBuffer.write(buffer);
                outBuffer.end();
            }
            return err;
        });

        return false;
    }
}

export class Schematic extends Exporter {
    convertToNBT() {
        const bufferSize = this._sizeVector.x * this._sizeVector.y * this._sizeVector.z;

        const blocksData = Array<number>(bufferSize);
        VoxelManager.Get.voxels.forEach((voxel) => {
            const indexVector = Vector3.sub(voxel.position, VoxelManager.Get.min);
            const index = this._getBufferIndex(indexVector, this._sizeVector);
            blocksData[index] = Block.Stone;
        });

        const nbt: NBT = {
            type: TagType.Compound,
            name: 'Schematic',
            value: {
                Width: { type: TagType.Short, value: this._sizeVector.x },
                Height: { type: TagType.Short, value: this._sizeVector.y },
                Length: { type: TagType.Short, value: this._sizeVector.z },
                Materials: { type: TagType.String, value: 'Alpha' },
                Blocks: { type: TagType.ByteArray, value: blocksData },
                Data: { type: TagType.ByteArray, value: new Array<number>(bufferSize).fill(0) },
                Entities: { type: TagType.List, value: { type: TagType.Int, value: Array(0) } },
                TileEntities: { type: TagType.List, value: { type: TagType.Int, value: Array(0) } },
            },
        };

        return nbt;
    }

    _getBufferIndex(vec: Vector3, sizeVector: Vector3) {
        return (sizeVector.z * sizeVector.x * vec.y) + (sizeVector.x * vec.z) + vec.x;
    }

    getFormatFilter() {
        return {
            name: this.getFormatName(),
            extensions: ['schematic'],
        };
    }

    getFormatName() {
        return 'Schematic';
    }

    getFormatDisclaimer() {
        return 'Schematic files only support pre-1.13 blocks. As a result, all blocks will be exported as Stone. To export the blocks, use the .litematic format with the Litematica mod.';
    }
}

type BlockID = number;
type long = [number, number];

interface BlockMapping {
    [name: string]: BlockID
}

export class Litematic extends Exporter {
    // XZY
    _getBufferIndex(vec: Vector3) {
        return (this._sizeVector.z * this._sizeVector.x * vec.y) + (this._sizeVector.x * vec.z) + vec.x;
    }

    _createBlockMapping(): BlockMapping {
        const blockPalette = VoxelManager.Get.blockPalette;

        const blockMapping: BlockMapping = { 'air': 0 };
        for (let i = 0; i < blockPalette.length; ++i) {
            const blockName = blockPalette[i];
            blockMapping[blockName] = i + 1; // Ensure 0 maps to air
        }

        return blockMapping;
    }

    _createBlockBuffer(blockMapping: BlockMapping): Array<BlockID> {
        const bufferSize = this._sizeVector.x * this._sizeVector.y * this._sizeVector.z;

        const buffer = Array<BlockID>(bufferSize).fill(0);
        VoxelManager.Get.voxels.forEach((voxel) => {
            const indexVector = Vector3.sub(voxel.position, VoxelManager.Get.min);
            const index = this._getBufferIndex(indexVector);
            buffer[index] = blockMapping[voxel.block || 'air'];
        });

        return buffer;
    }

    _createBlockStates(blockMapping: BlockMapping) {
        const blockEncoding = this._encodeBlockBuffer(blockMapping);

        const blockStates = new Array<long>();

        for (let i = blockEncoding.length; i > 0; i -= 64) {
            let right = parseInt(blockEncoding.substring(i-32, i), 2);
            let left = parseInt(blockEncoding.substring(i-64, i-32), 2);

            // TODO: Cleanup, UINT32 -> INT32
            if (right > 2147483647) {
                right -= 4294967296;
            }
            if (left > 2147483647) {
                left -= 4294967296;
            }

            blockStates.push([left, right]);
        }

        return blockStates;
    }

    _encodeBlockBuffer(blockMapping: BlockMapping) {
        const blockBuffer = this._createBlockBuffer(blockMapping);

        const paletteSize = Object.keys(blockMapping).length;
        let stride = (paletteSize - 1).toString(2).length;
        stride = Math.max(2, stride);

        let encoding = '';
        for (let i = blockBuffer.length - 1; i >= 0; --i) {
            encoding += blockBuffer[i].toString(2).padStart(stride, '0');
        }

        const requiredLength = Math.ceil(encoding.length / 64) * 64;
        encoding = encoding.padStart(requiredLength, '0');

        return encoding;
    }

    _createBlockStatePalette(blockMapping: BlockMapping) {
        const blockStatePalette = Array(Object.keys(blockMapping).length);
        for (const block of Object.keys(blockMapping)) {
            const index = blockMapping[block];
            const blockName = 'minecraft:' + block;
            blockStatePalette[index] = { Name: { type: TagType.String, value: blockName } };
        }
        blockStatePalette[0] = { Name: { type: TagType.String, value: 'minecraft:air' } };

        return blockStatePalette;
    }

    convertToNBT() {
        const bufferSize = this._sizeVector.x * this._sizeVector.y * this._sizeVector.z;
        const blockMapping = this._createBlockMapping();

        const blockStates = this._createBlockStates(blockMapping);
        const blockStatePalette = this._createBlockStatePalette(blockMapping);

        const nbt: NBT = {
            type: TagType.Compound,
            name: 'Litematic',
            value: {
                Metadata: {
                    type: TagType.Compound, value: {
                        Author: { type: TagType.String, value: '' },
                        Description: { type: TagType.String, value: '' },
                        Size: {
                            type: TagType.Compound, value: {
                                x: { type: TagType.Int, value: this._sizeVector.x },
                                y: { type: TagType.Int, value: this._sizeVector.y },
                                z: { type: TagType.Int, value: this._sizeVector.z },
                            },
                        },
                        Name: { type: TagType.String, value: '' },
                        RegionCount: { type: TagType.Int, value: 1 },
                        TimeCreated: { type: TagType.Long, value: [0, 0] },
                        TimeModified: { type: TagType.Long, value: [0, 0] },
                        TotalBlocks: { type: TagType.Int, value: VoxelManager.Get.voxels.length },
                        TotalVolume: { type: TagType.Int, value: bufferSize },
                    },
                },
                Regions: {
                    type: TagType.Compound, value: {
                        Unnamed: {
                            type: TagType.Compound, value: {
                                BlockStates: { type: TagType.LongArray, value: blockStates },
                                PendingBlockTicks: { type: TagType.List, value: { type: TagType.Int, value: [] } },
                                Position: {
                                    type: TagType.Compound, value: {
                                        x: { type: TagType.Int, value: 0 },
                                        y: { type: TagType.Int, value: 0 },
                                        z: { type: TagType.Int, value: 0 },
                                    },
                                },
                                BlockStatePalette: { type: TagType.List, value: { type: TagType.Compound, value: blockStatePalette } },
                                Size: {
                                    type: TagType.Compound, value: {
                                        x: { type: TagType.Int, value: this._sizeVector.x },
                                        y: { type: TagType.Int, value: this._sizeVector.y },
                                        z: { type: TagType.Int, value: this._sizeVector.z },
                                    },
                                },
                                PendingFluidTicks: { type: TagType.List, value: { type: TagType.Int, value: [] } },
                                TileEntities: { type: TagType.List, value: { type: TagType.Int, value: [] } },
                                Entities: { type: TagType.List, value: { type: TagType.Int, value: [] } },
                            },
                        },
                    },
                },
                MinecraftDataVersion: { type: TagType.Int, value: 2730 },
                Version: { type: TagType.Int, value: 5 },
            },
        };

        return nbt;
    }

    getFormatFilter() {
        return {
            name: this.getFormatName(),
            extensions: ['litematic'],
        };
    }

    getFormatName() {
        return 'Litematic';
    }
}
