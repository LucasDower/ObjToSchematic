import { Vector3 } from '../vector';
import { BlockMesh } from '../block_mesh';
import { TOptional } from '../util';

export abstract class IExporter {
    protected _sizeVector!: Vector3;

    /** The display name of this exporter */
    public abstract getFormatName(): string;

    /** The file type extension of this exporter
     * @note Do not include the dot prefix, e.g. 'obj' not '.obj'.
     */
    public abstract getFileExtension(): string;

    /** */
    public getFormatDisclaimer(): TOptional<string> {
        return;
    }

    public abstract export(blockMesh: BlockMesh, filePath: string): boolean;

    public getFormatFilter() {
        return {
            name: this.getFormatName(),
            extensions: [this.getFileExtension()],
        };
    }
}
