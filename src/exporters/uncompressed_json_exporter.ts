import { BlockMesh } from '../block_mesh';
import { IExporter, TStructureExport } from './base_exporter';

export class UncompressedJSONExporter extends IExporter {
    public override getFormatFilter() {
        return {
            name: 'Uncompressed JSON',
            extension: 'json',
        };
    }

    public override export(blockMesh: BlockMesh): TStructureExport {
        const blocks = blockMesh.getBlocks();

        const lines = new Array<string>();
        lines.push('[');

        // Serialise all block except for the last one.
        for (let i = 0; i < blocks.length - 1; ++i) {
            const block = blocks[i];
            const pos = block.voxel.position;
            lines.push(`{ "x": ${pos.x}, "y": ${pos.y}, "z": ${pos.z}, "block_name": "${block.blockInfo.name}" },`);
        }

        // Serialise the last block but don't include the comma at the end.
        {
            const block = blocks[blocks.length - 1];
            const pos = block.voxel.position;
            lines.push(`{ "x": ${pos.x}, "y": ${pos.y}, "z": ${pos.z}, "block_name": "${block.blockInfo.name}" }`);
        }

        lines.push(']');

        const json = lines.join('');

        return { type: 'single', extension: '.json', content: Buffer.from(json) };
    }
}
