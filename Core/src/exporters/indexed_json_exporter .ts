import { BlockMesh } from '../block_mesh';
import { IExporter, TStructureExport } from './base_exporter';

export class IndexedJSONExporter extends IExporter {
    public override getFormatFilter() {
        return {
            name: 'Indexed JSON',
            extension: 'json',
        };
    }

    public override export(blockMesh: BlockMesh): TStructureExport {
        const blocks = blockMesh.getBlocks();

        const blocksUsed = blockMesh.getBlockPalette();
        const blockToIndex = new Map<string, number>();
        const indexToBlock = new Map<number, string>();
        for (let i = 0; i < blocksUsed.length; ++i) {
            blockToIndex.set(blocksUsed[i], i);
            indexToBlock.set(i, blocksUsed[i]);
        }

        const blockArray = new Array<Array<number>>();

        // Serialise all block except for the last one.
        for (let i = 0; i < blocks.length; ++i) {
            const block = blocks[i];
            const pos = block.voxel.position;
            blockArray.push([pos.x, pos.y, pos.z, blockToIndex.get(block.blockInfo.name)!]);
        }

        const json = JSON.stringify({
            blocks: Object.fromEntries(indexToBlock),
            xyzi: blockArray,
        });

        const encoder = new TextEncoder();
        const buffer = encoder.encode(json);

        return { type: 'single', extension: '.json', content: buffer };
    }
}
