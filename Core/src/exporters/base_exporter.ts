import { BlockMesh } from '../block_mesh';

export type TStructureRegion = { name: string, content: ArrayBuffer };

export type TStructureExport =
    | { type: 'single', extension: string, content: ArrayBuffer }
    | { type: 'multiple', extension: string, regions: TStructureRegion[] }

export abstract class IExporter {
    /** The file type extension of this exporter.
     * @note Do not include the dot prefix, e.g. 'obj' not '.obj'.
     */
    public abstract getFormatFilter(): {
        name: string,
        extension: string,
    }

    /**
     * Export a block mesh to a file.
     * @param blockMesh The block mesh to export.
     * @param filePath The location to save the file to.
     */
    public abstract export(blockMesh: BlockMesh): TStructureExport;
}
