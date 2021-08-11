import zlib from "zlib";
import fs from "fs";
import { byte, NBT, parse, short, TagType, writeUncompressed } from "prismarine-nbt";
import { Vector3 } from "./vector";
import { remote } from "electron"
import { VoxelManager } from "./voxel_manager";

//const zlib = require("zlib");
//const fs = require('fs');
//const { parse, writeUncompressed } = require('prismarine-nbt');
//const { Vector3 } = require('./vector.js');
//const dialog = require('electron').remote.dialog;

/*
interface SchematicValue<T> {
    type: string,
    value: T
}
*/


export class Schematic {

    private _sizeVector: Vector3;
    private _schematic: NBT;

    constructor(voxelManager: VoxelManager) {
        //const minPos = voxelManager._voxelCentreToPosition(new Vector3(voxelManager.minX, voxelManager.minY, voxelManager.minZ));
        //const maxPos = voxelManager._voxelCentreToPosition(new Vector3(voxelManager.maxX, voxelManager.maxY, voxelManager.maxZ));

        const minPos = new Vector3(voxelManager.minX, voxelManager.minY, voxelManager.minZ);
        const maxPos = new Vector3(voxelManager.maxX, voxelManager.maxY, voxelManager.maxZ);
        
        this._sizeVector = Vector3.addScalar(Vector3.sub(maxPos, minPos), 1);
        const bufferSize = this._sizeVector.x * this._sizeVector.y * this._sizeVector.z;

        let blocksData = Array<number>(bufferSize);
        voxelManager.voxels.forEach((voxel, i) => {
            const indexVector = Vector3.sub(voxel, minPos);
            const index = this._getBufferIndex(indexVector);
            //this._schematic.value.Blocks.value[index] = 1;
            blocksData[index] = 1.0
        });

        this._schematic = {
            type: TagType.Compound,
            name: 'Schematic',
            value: {
                Width:        { type: TagType.Short,     value: this._sizeVector.x },
                Height:       { type: TagType.Short,     value: this._sizeVector.y },
                Length:       { type: TagType.Short,     value: this._sizeVector.z },
                Materials:    { type: TagType.String,    value: 'Alpha' },
                Blocks:       { type: TagType.ByteArray, value: blocksData },
                Data:         { type: TagType.ByteArray, value: new Array<number>(bufferSize).fill(0) },
                Entities:     { type: TagType.List,      value: {type: TagType.Int, value: Array(0)} },
                TileEntities: { type: TagType.List,      value: {type: TagType.Int, value: Array(0)} }
            }
        };

        /*
        for (let i = 0; i < voxelManager.voxels.length; ++i) {
            const voxel = voxelManager.voxels[i];
            const pos = voxelManager._voxelCentreToPosition(voxel);

            const indexVector = Vector3.sub(pos, minPos);
            const index = this._getBufferIndex(indexVector);
            this.schematic.value.Blocks.value[index] = 1;
        }  
        */  
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
                console.log(err);
            }
        });
    }

}