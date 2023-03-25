//import { NBT, TagType } from 'prismarine-nbt';

import { NBT, TagType } from 'prismarine-nbt';

import { BLOCK_IDS } from '../../res/block_ids';
import { BlockMesh } from '../block_mesh';
import { StatusHandler } from '../status';
import { LOG_WARN } from '../util/log_util';
import { saveNBT } from '../util/nbt_util';
import { Vector3 } from '../vector';
import { IExporter } from './base_exporter';

export class Schematic extends IExporter {
    public override getFormatFilter() {
        return {
            name: 'Schematic',
            extension: 'schematic',
        };
    }

    public override export(blockMesh: BlockMesh) {
        const nbt = this._convertToNBT(blockMesh);
        return saveNBT(nbt);
    }

    private _convertToNBT(blockMesh: BlockMesh): NBT {
        const bounds = blockMesh.getVoxelMesh().getBounds();
        const sizeVector = Vector3.sub(bounds.max, bounds.min).add(1);

        const bufferSize = sizeVector.x * sizeVector.y * sizeVector.z;
        const blocksData = Array<number>(bufferSize);
        const metaData = Array<number>(bufferSize);

        // TODO Unimplemented
        const schematicBlocks: { [blockName: string]: { id: number, meta: number, name: string } } = BLOCK_IDS;

        const blocks = blockMesh.getBlocks();
        const unsupportedBlocks = new Set<string>();
        let numBlocksUnsupported = 0;
        for (const block of blocks) {
            const indexVector = Vector3.sub(block.voxel.position, bounds.min);
            const index = this._getBufferIndex(indexVector, sizeVector);
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
            StatusHandler.warning(
                `${numBlocksUnsupported} blocks (${unsupportedBlocks.size} unique) are not supported by the .schematic format, Stone block are used in their place. Try using the schematic-friendly palette, or export using .litematica`,
            );
            LOG_WARN(unsupportedBlocks);
        }

        // TODO Unimplemented
        const nbt: NBT = {
            type: TagType.Compound,
            name: 'Schematic',
            value: {
                Width: { type: TagType.Short, value: sizeVector.x },
                Height: { type: TagType.Short, value: sizeVector.y },
                Length: { type: TagType.Short, value: sizeVector.z },
                Materials: { type: TagType.String, value: 'Alpha' },
                Blocks: { type: TagType.ByteArray, value: blocksData },
                Data: { type: TagType.ByteArray, value: metaData },
                Entities: { type: TagType.List, value: { type: TagType.Int, value: Array(0) } },
                TileEntities: { type: TagType.List, value: { type: TagType.Int, value: Array(0) } },
            },
        };

        return nbt;
    }

    private _getBufferIndex(vec: Vector3, sizeVector: Vector3) {
        return (sizeVector.z * sizeVector.x * vec.y) + (sizeVector.x * vec.z) + vec.x;
    }
}
