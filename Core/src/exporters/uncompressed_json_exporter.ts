import { OtS_BlockMesh } from '../ots_block_mesh';
import { IExporter, TStructureExport } from './base_exporter';

export class UncompressedJSONExporter extends IExporter {
    public override getFormatFilter() {
        return {
            name: 'Uncompressed JSON',
            extension: 'json',
        };
    }

    public override export(blockMesh: OtS_BlockMesh): TStructureExport {
        const blocks = blockMesh.getBlocks();

        const lines = new Array<string>();
        lines.push('[');
        {
            // Serialise all block except for the last one.
            for (const { name, position } of blockMesh.getBlocks()) {
                lines.push(`{ "x": ${position.x}, "y": ${position.y}, "z": ${position.z}, "block_name": "${name}" },`);
            }

            // Update the last block to not include the comma at the end.
            {
                const lastIndex = lines.length - 1;
                const lastEntry = lines[lastIndex];
                lines[lastIndex] = lastEntry.slice(0, -1);
            }
        }
        lines.push(']');

        const json = lines.join('');

        const encoder = new TextEncoder();
        const buffer = encoder.encode(json);

        return { type: 'single', extension: '.json', content: buffer };
    }
}
