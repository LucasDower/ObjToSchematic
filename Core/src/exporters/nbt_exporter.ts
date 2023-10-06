import { NBT, TagType } from 'prismarine-nbt';

import { BlockMesh } from '../block_mesh';
import { AppConstants } from '../constants';
import { AppUtil } from '../util';
import { saveNBT } from '../util/nbt_util';
import { Vector3 } from '../vector';
import { IExporter, TStructureExport, TStructureRegion } from './base_exporter';
import { ASSERT } from '../util/error_util';

export class NBTExporter extends IExporter {
    public override getFormatFilter() {
        return {
            name: 'Structure Blocks',
            extension: 'nbt',
        };
    }

    private _processChunk(blockMesh: BlockMesh, min: Vector3, blockNameToIndex: Map<string, number>, palette: any): ArrayBuffer {
        const blocks: any[] = [];
        for (const block of blockMesh.getBlocks()) {
            const pos = block.voxel.position;
            const blockIndex = blockNameToIndex.get(block.blockInfo.name);

            if (blockIndex !== undefined) {
                if (pos.x >= min.x && pos.x < min.x + 48 && pos.y >= min.y && pos.y < min.y + 48 && pos.z >= min.z && pos.z < min.z + 48) {
                    const translatedPos = Vector3.sub(block.voxel.position, min);
                    ASSERT(translatedPos.x >= 0 && translatedPos.x < 48);
                    ASSERT(translatedPos.y >= 0 && translatedPos.y < 48);
                    ASSERT(translatedPos.z >= 0 && translatedPos.z < 48);

                    blocks.push({
                        pos: {
                            type: TagType.List,
                            value: {
                                type: TagType.Int,
                                value: translatedPos.toArray(),
                            },
                        },
                        state: {
                            type: TagType.Int,
                            value: blockIndex,
                        },
                    });
                }
            }
        }
        ASSERT(blocks.length < 48 * 48 * 48);

        const nbt: NBT = {
            type: TagType.Compound,
            name: 'SchematicBlocks',
            value: {
                DataVersion: {
                    type: TagType.Int,
                    value: AppConstants.DATA_VERSION,
                },
                size: {
                    type: TagType.List,
                    value: {
                        type: TagType.Int,
                        value: [48, 48, 48],
                    },
                },
                palette: {
                    type: TagType.List,
                    value: {
                        type: TagType.Compound,
                        value: palette,
                    },
                },
                blocks: {
                    type: TagType.List,
                    value: {
                        type: TagType.Compound,
                        value: blocks,
                    },
                },
            },
        };

        return saveNBT(nbt);
    }

    public override export(blockMesh: BlockMesh) {
        const bounds = blockMesh.getVoxelMesh().getBounds();
        /*
        const sizeVector = bounds.getDimensions().add(1);

        const isTooBig = sizeVector.x > 48 && sizeVector.y > 48 && sizeVector.z > 48;
        if (isTooBig) {
            StatusHandler.warning(LOC('export.nbt_exporter_too_big'));
        }
        */

        const blockNameToIndex = new Map<string, number>();
        const palette: any = [];
        for (const blockName of blockMesh.getBlockPalette()) {
            palette.push({
                Name: {
                    type: TagType.String,
                    value: AppUtil.Text.namespaceBlock(blockName),
                },
            });
            blockNameToIndex.set(blockName, palette.length - 1);
        }

        const regions: TStructureRegion[] = [];

        for (let x = bounds.min.x; x < bounds.max.x; x += 48) {
            for (let y = bounds.min.y; y < bounds.max.y; y += 48) {
                for (let z = bounds.min.z; z < bounds.max.z; z += 48) {
                    const buffer = this._processChunk(blockMesh, new Vector3(x, y, z), blockNameToIndex, palette);
                    regions.push({ content: buffer, name: `x${x - bounds.min.x}_y${y - bounds.min.y}_z${z - bounds.min.z}` });
                }
            }
        }

        const out: TStructureExport = {
            type: 'multiple',
            extension: '.nbt',
            regions: regions
        }

        return out;
    }
}
