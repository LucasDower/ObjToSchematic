import * as zlib from 'zlib';
import * as fs from 'fs';
import path from 'path';
import { NBT, TagType, writeUncompressed } from 'prismarine-nbt';
import { Vector3 } from './vector';
import { BlockMesh } from './block_mesh';
import { RESOURCES_DIR } from './util';
import { StatusHandler } from './status';

export abstract class IExporter {
    protected _sizeVector!: Vector3;

    public abstract convertToNBT(blockMesh: BlockMesh): NBT
    abstract getFormatFilter(): Electron.FileFilter;
    abstract getFormatName(): string;
    abstract getFileExtension(): string;

    getFormatDisclaimer(): string | undefined {
        return;
    }

    export(blockMesh: BlockMesh, filePath: string): boolean {
        const bounds = blockMesh.getVoxelMesh()?.getBounds();
        this._sizeVector = Vector3.sub(bounds.max, bounds.min).addScalar(1);

        const nbt = this.convertToNBT(blockMesh);

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

export class Schematic extends IExporter {
    public override convertToNBT(blockMesh: BlockMesh) {
        const bufferSize = this._sizeVector.x * this._sizeVector.y * this._sizeVector.z;

        const blocksData = Array<number>(bufferSize);
        const metaData = Array<number>(bufferSize);
        const bounds = blockMesh.getVoxelMesh().getBounds();

        const schematicBlocks: { [blockName: string]: { id: number, meta: number, name: string } } = JSON.parse(
            fs.readFileSync(path.join(RESOURCES_DIR, './block_ids.json'), 'utf8'),
        );

        const blocks = blockMesh.getBlocks();
        const unsupportedBlocks = new Set<string>();
        let numBlocksUnsupported = 0;
        for (const block of blocks) {
            const indexVector = Vector3.sub(block.voxel.position, bounds.min);
            const index = this._getBufferIndex(indexVector, this._sizeVector);
            if (block.blockInfo.name in schematicBlocks) {
                const schematicBlock = schematicBlocks[block.blockInfo.name];
                blocksData[index] = new Int8Array([schematicBlock.id])[0];
                metaData[index] = new Int8Array([schematicBlock.meta])[0];
            } else {
                blocksData[index] = 1; // Default to a Stone block
                metaData[index] = 0;
                unsupportedBlocks.add(block.blockInfo.name);
                ++numBlocksUnsupported;
            }
        }

        if (unsupportedBlocks.size > 0) {
            StatusHandler.Get.add(
                'warning',
                `${numBlocksUnsupported} blocks (${unsupportedBlocks.size} unique) are not supported by the .schematic format, Stone block are used in their place. Try using the schematic-friendly palette, or export using .litematica`,
            );
        }

        const nbt: NBT = {
            type: TagType.Compound,
            name: 'Schematic',
            value: {
                Width: { type: TagType.Short, value: this._sizeVector.x },
                Height: { type: TagType.Short, value: this._sizeVector.y },
                Length: { type: TagType.Short, value: this._sizeVector.z },
                Materials: { type: TagType.String, value: 'Alpha' },
                Blocks: { type: TagType.ByteArray, value: blocksData },
                Data: { type: TagType.ByteArray, value: metaData },
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

    getFileExtension(): string {
        return 'schematic';
    }
}

type BlockID = number;
type long = [number, number];

interface BlockMapping {
    [name: string]: BlockID
}

export class Litematic extends IExporter {
    // XZY
    _getBufferIndex(vec: Vector3) {
        return (this._sizeVector.z * this._sizeVector.x * vec.y) + (this._sizeVector.x * vec.z) + vec.x;
    }

    _createBlockMapping(blockMesh: BlockMesh): BlockMapping {
        const blockPalette = blockMesh.getBlockPalette();

        const blockMapping: BlockMapping = { 'air': 0 };
        for (let i = 0; i < blockPalette.length; ++i) {
            const blockName = blockPalette[i];
            blockMapping[blockName] = i + 1; // Ensure 0 maps to air
        }

        return blockMapping;
    }

    _createBlockBuffer(blockMesh: BlockMesh, blockMapping: BlockMapping): Array<BlockID> {
        const bufferSize = this._sizeVector.x * this._sizeVector.y * this._sizeVector.z;

        const buffer = Array<BlockID>(bufferSize).fill(0);
        const blocks = blockMesh.getBlocks();
        const bounds = blockMesh.getVoxelMesh().getBounds();

        for (const block of blocks) {
            const indexVector = Vector3.sub(block.voxel.position, bounds.min);
            const index = this._getBufferIndex(indexVector);
            buffer[index] = blockMapping[block.blockInfo.name || 'air'];
        }

        return buffer;
    }

    _createBlockStates(blockMesh: BlockMesh, blockMapping: BlockMapping) {
        const blockEncoding = this._encodeBlockBuffer(blockMesh, blockMapping);

        const blockStates = new Array<long>();

        for (let i = blockEncoding.length; i > 0; i -= 64) {
            let right = parseInt(blockEncoding.substring(i - 32, i), 2);
            let left = parseInt(blockEncoding.substring(i - 64, i - 32), 2);

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

    _encodeBlockBuffer(blockMesh: BlockMesh, blockMapping: BlockMapping) {
        const blockBuffer = this._createBlockBuffer(blockMesh, blockMapping);

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

    convertToNBT(blockMesh: BlockMesh) {
        const bufferSize = this._sizeVector.x * this._sizeVector.y * this._sizeVector.z;
        const blockMapping = this._createBlockMapping(blockMesh);

        const blockStates = this._createBlockStates(blockMesh, blockMapping);
        const blockStatePalette = this._createBlockStatePalette(blockMapping);
        const numBlocks = blockMesh.getBlocks().length;

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

    getFileExtension(): string {
        return 'litematic';
    }
}
