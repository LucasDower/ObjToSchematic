import { BlockMesh } from '../block_mesh';
import { RESOURCES_DIR } from '../util';
import { IExporter } from './base_exporter';
import { Vector3 } from '../vector';
import { StatusHandler } from '../status';

import path from 'path';
import fs from 'fs';
import { NBT, TagType } from 'prismarine-nbt';

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
