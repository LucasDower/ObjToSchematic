import zlib from "zlib";
import fs from "fs";
import { NBT, TagType, writeUncompressed } from "prismarine-nbt";
import { Vector3 } from "./vector";
import { VoxelManager } from "./voxel_manager";
import { Block } from "./block_atlas";
import { powerMonitor } from "electron";


export class Schematic {

    private _sizeVector: Vector3;
    private _schematic: NBT;

    constructor(voxelManager: VoxelManager) {
        const minPos = new Vector3(voxelManager.minX, voxelManager.minY, voxelManager.minZ);
        const maxPos = new Vector3(voxelManager.maxX, voxelManager.maxY, voxelManager.maxZ);

        this._sizeVector = Vector3.addScalar(Vector3.sub(maxPos, minPos), 1);
        const bufferSize = this._sizeVector.x * this._sizeVector.y * this._sizeVector.z;

        let blocksData = Array<number>(bufferSize);
        voxelManager.voxels.forEach(voxel => {
            //console.log(voxel);
            const indexVector = Vector3.sub(voxel.position, minPos);
            const index = this._getBufferIndex(indexVector);
            //this._schematic.value.Blocks.value[index] = 1;
            blocksData[index] = Block.Stone;
        });

        this._schematic = {
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
                TileEntities: { type: TagType.List, value: { type: TagType.Int, value: Array(0) } }
            }
        };
    }

    _getBufferIndex(vec: Vector3) {
        return (this._sizeVector.z * this._sizeVector.x * vec.y) + (this._sizeVector.x * vec.z) + vec.x;
    }

    exportSchematic(filePath: string) {
        const outBuffer = fs.createWriteStream(filePath);
        const newBuffer = writeUncompressed(this._schematic, "big");

        zlib.gzip(newBuffer, (err, buffer) => {
            if (!err) {
                outBuffer.write(buffer);
                outBuffer.end(() => console.log('Written!'));
            }
            else {
                throw err;
            }
        });
    }

}



export class Litematic {

    private _sizeVector: Vector3;
    private _litematic: NBT;

    // XZY
    _getBufferIndex(vec: Vector3) {
        return (this._sizeVector.z * this._sizeVector.x * vec.y) + (this._sizeVector.x * vec.z) + vec.x;
    }

    constructor(voxelManager: VoxelManager) {
        const minPos = new Vector3(voxelManager.minX, voxelManager.minY, voxelManager.minZ);
        const maxPos = new Vector3(voxelManager.maxX, voxelManager.maxY, voxelManager.maxZ);
        this._sizeVector = Vector3.sub(maxPos, minPos).addScalar(1);
        console.log("sizeVector", this._sizeVector);

        const bufferSize = this._sizeVector.x * this._sizeVector.y * this._sizeVector.z;
        let buffer = Array<number>(bufferSize);
        for (let i = 0; i < bufferSize; ++i) {
            buffer[i] = 0;
        }

        const blockPalette = voxelManager.blockPalette;
        let blockMapping: { [name: string]: number } = {"air": 0};
        for (let i = 0; i < blockPalette.length; ++i) {
            const blockName = blockPalette[i];
            blockMapping[blockName] = i + 1; // Ensure 0 maps to air
        }
        console.log(blockMapping);

        const paletteSize = blockPalette.length + 1;
        const stride = (paletteSize - 1).toString(2).length;
        const numBits = stride * bufferSize;
        const numLongs = Math.ceil(numBits / 64);
        console.log("numLongs", numLongs);
        console.log("stride", stride);

        voxelManager.voxels.forEach(voxel => {
            const indexVector = Vector3.sub(voxel.position, minPos);
            const index = this._getBufferIndex(indexVector);
            buffer[index] = blockMapping[voxel.block];
        });

        let blockStates: [number, number][] = [];
        for (let i = 0; i < numLongs; ++i) {
            blockStates.push([0, 0]);
        }

        let str = "";
        for (let i = 0; i < bufferSize; ++i) {
            str = buffer[i].toString(2).padStart(stride, "0") + str;
        }
        let a = Math.ceil(str.length / 64) * 64;
        str = str.padStart(a, "0");

        let j = 0;
        for (let i = str.length; i > 0; i -= 64) {
            let right = parseInt(str.substring(i-32, i), 2);
            let left = parseInt(str.substring(i-64, i-32), 2);
            if (right > Math.pow(2, 30)) {
                right = -((right << 1) >> 1);
            }
            if (left > Math.pow(2, 30)) {
                left = -((left << 1) >> 1);
            }
            blockStates[j] = [left, right];
            ++j;
        }
        console.log(blockStates);

        let blockStatePalette = Array(paletteSize);
        for (const block of blockPalette) {
            let index = blockMapping[block];
            let blockName = "minecraft:" + block;
            blockStatePalette[index] = { Name: { type: TagType.String, value: blockName } };
        }
        blockStatePalette[0] = { Name: { type: TagType.String, value: "minecraft:air" } };

        this._litematic = {
            type: TagType.Compound,
            name: 'Litematic',
            value: {
                Metadata: {
                    type: TagType.Compound, value: {
                        Author: { type: TagType.String, value: "" },
                        Description: { type: TagType.String, value: "" },
                        Size: {
                            type: TagType.Compound, value: {
                                x: { type: TagType.Int, value: this._sizeVector.x },
                                y: { type: TagType.Int, value: this._sizeVector.y },
                                z: { type: TagType.Int, value: this._sizeVector.z },
                            }
                        },
                        Name: { type: TagType.String, value: "" },
                        RegionCount: { type: TagType.Int, value: 1 },
                        TimeCreated: { type: TagType.Long, value: [0, 0] },
                        TimeModified: { type: TagType.Long, value: [0, 0] },
                        TotalBlocks: { type: TagType.Int, value: voxelManager.voxels.length },
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
                                    }
                                },
                                BlockStatePalette: { type: TagType.List, value: { type: TagType.Compound, value: blockStatePalette } },
                                Size: {
                                    type: TagType.Compound, value: {
                                        x: { type: TagType.Int, value: this._sizeVector.x },
                                        y: { type: TagType.Int, value: this._sizeVector.y },
                                        z: { type: TagType.Int, value: this._sizeVector.z },
                                    }
                                },
                                PendingFluidTicks: { type: TagType.List, value: { type: TagType.Int, value: [] } },
                                TileEntities: { type: TagType.List, value: { type: TagType.Int, value: [] } },
                                Entities: { type: TagType.List, value: { type: TagType.Int, value: [] } }
                            }
                        }
                    },
                },
                MinecraftDataVersion: { type: TagType.Int, value: 2730 },
                Version: { type: TagType.Int, value: 5 }
            }
        };
    }

    exportSchematic(filePath: string) {
        const outBuffer = fs.createWriteStream(filePath);
        const newBuffer = writeUncompressed(this._litematic, "big");

        zlib.gzip(newBuffer, (err, buffer) => {
            if (!err) {
                outBuffer.write(buffer);
                outBuffer.end(() => console.log('Written!'));
            }
            else {
                throw err;
            }
        });
    }

}