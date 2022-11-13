import { NBT, TagType } from 'prismarine-nbt';

import { BlockMesh } from '../block_mesh';
import { AppConstants } from '../constants';
import { AppUtil } from '../util';
import { LOG } from '../util/log_util';
import { MathUtil } from '../util/math_util';
import { saveNBT } from '../util/nbt_util';
import { Vector3 } from '../vector';
import { IExporter } from './base_exporter';

export class SchemExporter extends IExporter {
    public override getFormatFilter() {
        return {
            name: this.getFormatName(),
            extensions: ['schem'],
        };
    }

    public override getFormatName() {
        return 'Sponge Schematic';
    }

    public override getFileExtension(): string {
        return 'schem';
    }

    private static SCHEMA_VERSION = 2;

    public override export(blockMesh: BlockMesh, filePath: string): boolean {
        const bounds = blockMesh.getVoxelMesh().getBounds();
        const sizeVector = bounds.getDimensions().add(1);

        // https://github.com/SpongePowered/Schematic-Specification/blob/master/versions/schematic-3.md#paletteObject
        // const blockMapping: BlockMapping = {};
        const blockMapping: {[name: string]: { type: TagType, value: any }} = {
            'minecraft:air': { type: TagType.Int, value: 0 },
        };

        let blockIndex = 1;
        for (const blockName of blockMesh.getBlockPalette()) {
            const namespacedBlockName = AppUtil.Text.namespaceBlock(blockName);
            
            blockMapping[namespacedBlockName] = { type: TagType.Int, value: blockIndex };
            ++blockIndex;
        }
        LOG(blockMapping);

        // const paletteObject = SchemExporter._createBlockStatePalette(blockMapping);
        const blockData = new Array<number>(sizeVector.x * sizeVector.y * sizeVector.z).fill(0);
        for (const block of blockMesh.getBlocks()) {
            const indexVector = Vector3.sub(block.voxel.position, bounds.min);
            const bufferIndex = SchemExporter._getBufferIndex(sizeVector, indexVector);
            const namespacedBlockName = AppUtil.Text.namespaceBlock(block.blockInfo.name);
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
            blockEncoding[i] = MathUtil.int8(blockEncoding[i]);
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

        saveNBT(nbt, filePath);

        return false;
    }

    private static _getBufferIndex(dimensions: Vector3, vec: Vector3) {
        return vec.x + (vec.z * dimensions.x) + (vec.y * dimensions.x * dimensions.z);
    }
}
