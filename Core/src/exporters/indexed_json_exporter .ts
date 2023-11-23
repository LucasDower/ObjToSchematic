import { OtS_BlockMesh } from '../ots_block_mesh';
import { IExporter, TStructureExport } from './base_exporter';

export class IndexedJSONExporter extends IExporter {
    public override getFormatFilter() {
        return {
            name: 'Indexed JSON',
            extension: 'json',
        };
    }

    public override export(blockMesh: OtS_BlockMesh): TStructureExport {
        const blocks = blockMesh.getBlocks();

        const blocksUsed = Array.from(blockMesh.calcBlocksUsed());
        const blockToIndex = new Map<string, number>();
        const indexToBlock = new Map<number, string>();
        for (let i = 0; i < blocksUsed.length; ++i) {
            blockToIndex.set(blocksUsed[i], i);
            indexToBlock.set(i, blocksUsed[i]);
        }

        const blockArray = new Array<Array<number>>();

        // Serialise all block except for the last one.
        for (const { position, name } of blockMesh.getBlocks()) {
            blockArray.push([position.x, position.y, position.z, blockToIndex.get(name)!]);
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
