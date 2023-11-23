import { NBT, TagType } from 'prismarine-nbt';

import { AppConstants } from '../util/constants';
import { Vector3 } from '../util/vector';
import { IExporter, TStructureExport } from './base_exporter';
import { OtS_BlockMesh } from '../ots_block_mesh';
import { ASSERT, OtS_Util } from '../util/util';

type BlockID = number;
type long = [number, number];
type BlockMapping = Map<string, BlockID>;

export class Litematic extends IExporter {
    public override getFormatFilter() {
        return {
            name: 'Litematic',
            extension: 'litematic',
        };
    }

    public override export(blockMesh: OtS_BlockMesh): TStructureExport {
        const nbt = this._convertToNBT(blockMesh);
        return { type: 'single', extension: '.litematic', content: OtS_Util.NBT.saveNBT(nbt) };
    }

    /**
     * Create a mapping from block names to their respecitve index in the block state palette.
     */
    private _createBlockMapping(blockMesh: OtS_BlockMesh): BlockMapping {
        const blockMapping: BlockMapping = new Map();
        blockMapping.set('minecraft:air', 0);

        let index = 1;
        blockMesh.calcBlocksUsed().forEach((blockName) => {
            blockMapping.set(blockName, index);
            ++index;
        });

        return blockMapping;
    }

    /**
     * Pack the blocks into a buffer that's the dimensions of the block mesh.
     */
    private _createBlockBuffer(blockMesh: OtS_BlockMesh, blockMapping: BlockMapping): Uint32Array {
        const bounds = blockMesh.getBounds();
        const sizeVector = Vector3.sub(bounds.max, bounds.min).add(1);

        const buffer = new Uint32Array(sizeVector.x * sizeVector.y * sizeVector.z);

        for (const { position, name } of blockMesh.getBlocks()) {
            const indexVector = Vector3.sub(position, bounds.min);
            const bufferIndex = (sizeVector.z * sizeVector.x * indexVector.y) + (sizeVector.x * indexVector.z) + indexVector.x; // XZY ordering

            const mappingIndex = blockMapping.get(name);
            ASSERT(mappingIndex !== undefined, 'Invalid mapping index');

            buffer[bufferIndex] = mappingIndex;
        };

        return buffer;
    }

    private _createBlockStates(blockMesh: OtS_BlockMesh, blockMapping: BlockMapping) {
        const buffer = this._encodeBlockBuffer(blockMesh, blockMapping);

        const numBytes = buffer.length;
        const numBits = numBytes * 8;

        const blockStates = new Array<long>(Math.ceil(numBits / 64));

        let index = 0;
        for (let i = numBits; i > 0; i -= 64) {
            const rightBaseIndexBit = i - 32;
            const rightBaseIndexByte = rightBaseIndexBit / 8;

            let right = 0;
            right = (right << 8) + buffer[rightBaseIndexByte + 0];
            right = (right << 8) + buffer[rightBaseIndexByte + 1];
            right = (right << 8) + buffer[rightBaseIndexByte + 2];
            right = (right << 8) + buffer[rightBaseIndexByte + 3];

            const leftBaseIndexBit = i - 64;
            const leftBaseIndexByte = leftBaseIndexBit / 8;

            let left = 0;
            left = (left << 8) + buffer[leftBaseIndexByte + 0];
            left = (left << 8) + buffer[leftBaseIndexByte + 1];
            left = (left << 8) + buffer[leftBaseIndexByte + 2];
            left = (left << 8) + buffer[leftBaseIndexByte + 3];

            blockStates[index++] = [left, right];
        }

        return blockStates;
    }

    private _encodeBlockBuffer(blockMesh: OtS_BlockMesh, blockMapping: BlockMapping) {
        const blockBuffer = this._createBlockBuffer(blockMesh, blockMapping);

        const paletteSize = blockMapping.size;
        ASSERT(paletteSize >= 2, `Palette too small`);

        let stride = Math.ceil(Math.log2(paletteSize));
        stride = Math.max(2, stride);

        const expectedLengthBits = blockBuffer.length * stride;
        const requiredLengthBits = OtS_Util.Numeric.ceilToNearest(expectedLengthBits, 64);
        const startOffsetBits = requiredLengthBits - expectedLengthBits;

        const requiredLengthBytes = requiredLengthBits / 8;
        const buffer = new Uint8Array(requiredLengthBytes);

        // Write first few offset bits
        const fullBytesToWrite = Math.floor(startOffsetBits / 8);
        for (let i = 0; i < fullBytesToWrite; ++i) {
            buffer[i] = 0;
        }

        const remainingBitsToWrite = startOffsetBits - (fullBytesToWrite * 8);
        let currentByte = 0;
        let bitsWrittenToByte = remainingBitsToWrite;
        let nextBufferWriteIndex = fullBytesToWrite;

        for (let i = blockBuffer.length - 1; i >= 0; --i) {
            for (let j = 0; j < stride; ++j) {
                if (bitsWrittenToByte === 8) {
                    buffer[nextBufferWriteIndex] = currentByte;
                    ++nextBufferWriteIndex;
                    currentByte = 0; // Shouldn't be actually necessary to reset
                    bitsWrittenToByte = 0;
                }

                const bitToAddToByte = (blockBuffer[i] >> (stride - j - 1)) & 1;
                currentByte = (currentByte << 1) + bitToAddToByte;
                ++bitsWrittenToByte;
            }
        }

        // Write remaining partially filled byte
        buffer[nextBufferWriteIndex] = currentByte;
        ++nextBufferWriteIndex;
        currentByte = 0; // Shouldn't be actually necessary to reset
        bitsWrittenToByte = 0;

        return buffer;
    }

    private _createBlockStatePalette(blockMapping: BlockMapping) {
        const blockStatePalette = Array(Object.keys(blockMapping).length);

        blockMapping.forEach((index, blockName) => {
            blockStatePalette[index] = { Name: { type: TagType.String, value: blockName } };
        });
        blockStatePalette[0] = { Name: { type: TagType.String, value: 'minecraft:air' } };

        return blockStatePalette;
    }

    private _convertToNBT(blockMesh: OtS_BlockMesh) {
        const bounds = blockMesh.getBounds();
        const sizeVector = Vector3.sub(bounds.max, bounds.min).add(1);

        const bufferSize = sizeVector.x * sizeVector.y * sizeVector.z;
        const blockMapping = this._createBlockMapping(blockMesh);

        const blockStates = this._createBlockStates(blockMesh, blockMapping);
        const blockStatePalette = this._createBlockStatePalette(blockMapping);
        const numBlocks = blockMesh.getBlockCount();

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
                                x: { type: TagType.Int, value: sizeVector.x },
                                y: { type: TagType.Int, value: sizeVector.y },
                                z: { type: TagType.Int, value: sizeVector.z },
                            },
                        },
                        Name: { type: TagType.String, value: '' },
                        RegionCount: { type: TagType.Int, value: 1 },
                        TimeCreated: { type: TagType.Long, value: [0, 0] },
                        TimeModified: { type: TagType.Long, value: [0, 0] },
                        TotalBlocks: { type: TagType.Int, value: numBlocks },
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
                                        x: { type: TagType.Int, value: sizeVector.x },
                                        y: { type: TagType.Int, value: sizeVector.y },
                                        z: { type: TagType.Int, value: sizeVector.z },
                                    },
                                },
                                PendingFluidTicks: { type: TagType.List, value: { type: TagType.Int, value: [] } },
                                TileEntities: { type: TagType.List, value: { type: TagType.Int, value: [] } },
                                Entities: { type: TagType.List, value: { type: TagType.Int, value: [] } },
                            },
                        },
                    },
                },
                MinecraftDataVersion: { type: TagType.Int, value: AppConstants.DATA_VERSION },
                Version: { type: TagType.Int, value: 5 },
            },
        };

        return nbt;
    }
}
