import { NBT, TagType } from 'prismarine-nbt';

import { AppConstants } from '../util/constants';
import { Vector3 } from '../util/vector';
import { IExporter, TStructureExport } from './base_exporter';
import { OtS_BlockMesh } from '../ots_block_mesh';
import { OtS_Util } from '../util/util';

export class SchemExporter extends IExporter {
    private static SCHEMA_VERSION = 2;

    public override getFormatFilter() {
        return {
            name: 'Sponge Schematic',
            extension: 'schem',
        };
    }

    public override export(blockMesh: OtS_BlockMesh): TStructureExport {
        const bounds = blockMesh.getBounds();
        const sizeVector = bounds.getDimensions().add(1);

        // https://github.com/SpongePowered/Schematic-Specification/blob/master/versions/schematic-3.md#paletteObject
        // const blockMapping: BlockMapping = {};
        const blockMapping: {[name: string]: { type: TagType, value: any }} = {
            'minecraft:air': { type: TagType.Int, value: 0 },
        };

        let blockIndex = 1;
        for (const blockName of blockMesh.calcBlocksUsed()) {
            const namespacedBlockName = OtS_Util.Text.namespaceBlock(blockName);

            blockMapping[namespacedBlockName] = { type: TagType.Int, value: blockIndex };
            ++blockIndex;
        }

        const blockData = new Array<number>(sizeVector.x * sizeVector.y * sizeVector.z).fill(0);
        for (const { position, name } of blockMesh.getBlocks()) {
            const indexVector = Vector3.sub(position, bounds.min);
            const bufferIndex = SchemExporter._getBufferIndex(sizeVector, indexVector);
            const namespacedBlockName = OtS_Util.Text.namespaceBlock(name);
            blockData[bufferIndex] = blockMapping[namespacedBlockName].value;
        }

        const blockEncoding: number[] = [];
        for (let i = 0; i < blockData.length; ++i) {
            let id = blockData[i];

            while ((id & -128) != 0) {
                blockEncoding.push(id & 127 | 128);
                id >>>= 7;
            }
            blockEncoding.push(id);
        }

        for (let i = 0; i < blockEncoding.length; ++i) {
            blockEncoding[i] = OtS_Util.Numeric.int8(blockEncoding[i]);
        }

        const nbt: NBT = {
            type: TagType.Compound,
            name: 'Schematic',
            value: {
                Version: { type: TagType.Int, value: SchemExporter.SCHEMA_VERSION },
                DataVersion: { type: TagType.Int, value: AppConstants.DATA_VERSION },
                Width: { type: TagType.Short, value: sizeVector.x },
                Height: { type: TagType.Short, value: sizeVector.y },
                Length: { type: TagType.Short, value: sizeVector.z },
                PaletteMax: { type: TagType.Int, value: blockIndex },
                Palette: { type: TagType.Compound, value: blockMapping },
                BlockData: { type: TagType.ByteArray, value: blockEncoding },
            },
        };

        return { type: 'single', extension: '.schem', content: OtS_Util.NBT.saveNBT(nbt) };
    }

    private static _getBufferIndex(dimensions: Vector3, vec: Vector3) {
        return vec.x + (vec.z * dimensions.x) + (vec.y * dimensions.x * dimensions.z);
    }
}
