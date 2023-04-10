import { NBT, TagType } from 'prismarine-nbt';

import { BlockMesh } from '../block_mesh';
import { AppConstants } from '../constants';
import { LOC } from '../localiser';
import { StatusHandler } from '../status';
import { AppUtil } from '../util';
import { saveNBT } from '../util/nbt_util';
import { Vector3 } from '../vector';
import { IExporter } from './base_exporter';

export class NBTExporter extends IExporter {
    public override getFormatFilter() {
        return {
            name: 'Structure Blocks',
            extension: 'nbt',
        };
    }

    public override export(blockMesh: BlockMesh) {
        const bounds = blockMesh.getVoxelMesh().getBounds();
        const sizeVector = bounds.getDimensions().add(1);

        const isTooBig = sizeVector.x > 48 && sizeVector.y > 48 && sizeVector.z > 48;
        if (isTooBig) {
            StatusHandler.warning(LOC('export.nbt_exporter_too_big'));
        }

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

        const blocks: any = [];
        for (const block of blockMesh.getBlocks()) {
            const pos = block.voxel.position;
            const blockIndex = blockNameToIndex.get(block.blockInfo.name);
            if (blockIndex !== undefined) {
                if (pos.x > -24 && pos.x <= 24 && pos.y > -24 && pos.y <= 24 && pos.z > -24 && pos.z <= 24) {
                    blocks.push({
                        pos: {
                            type: TagType.List,
                            value: {
                                type: TagType.Int,
                                value: Vector3.sub(block.voxel.position, bounds.min).toArray(),
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
                        value: sizeVector.toArray(),
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
}
