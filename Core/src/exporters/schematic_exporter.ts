import { NBT, TagType } from 'prismarine-nbt';

import { BLOCK_IDS } from '../../../Editor/res/block_ids';
import { BlockMesh } from '../block_mesh';
import { LOG_WARN } from '../util/log_util';
import { saveNBT } from '../util/nbt_util';
import { Vector3 } from '../vector';
import { IExporter, TStructureExport } from './base_exporter';
import { OtS_BlockMesh } from '../ots_block_mesh';

export class Schematic extends IExporter {
    public override getFormatFilter() {
        return {
            name: 'Schematic',
            extension: 'schematic',
        };
    }

    public override export(blockMesh: OtS_BlockMesh): TStructureExport {
        const nbt = this._convertToNBT(blockMesh);
        return { type: 'single', extension: '.schematic', content: saveNBT(nbt) };
    }

    private _convertToNBT(blockMesh: OtS_BlockMesh): NBT {
        const bounds = blockMesh.getBounds();
        const sizeVector = Vector3.sub(bounds.max, bounds.min).add(1);

        const bufferSize = sizeVector.x * sizeVector.y * sizeVector.z;
        const blocksData = Array<number>(bufferSize);
        const metaData = Array<number>(bufferSize);

        // TODO Unimplemented
        const schematicBlocks: { [blockName: string]: { id: number, meta: number, name: string } } = BLOCK_IDS;

        const unsupportedBlocks = new Set<string>();
        let numBlocksUnsupported = 0;
        for (const { position, name } of blockMesh.getBlocks()) {
            const indexVector = Vector3.sub(position, bounds.min);
            const index = this._getBufferIndex(indexVector, sizeVector);
            if (name in schematicBlocks) {
                const schematicBlock = schematicBlocks[name];
                blocksData[index] = new Int8Array([schematicBlock.id])[0];
                metaData[index] = new Int8Array([schematicBlock.meta])[0];
            } else {
                blocksData[index] = 1; // Default to a Stone block
                metaData[index] = 0;
                unsupportedBlocks.add(name);
                ++numBlocksUnsupported;
            }
        }

        // TODO: StatusRework
        /*
        if (unsupportedBlocks.size > 0) {
            StatusHandler.warning(LOC('export.schematic_unsupported_blocks', { count: numBlocksUnsupported, unique: unsupportedBlocks.size }));
            LOG_WARN(unsupportedBlocks);
        }
        */

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
