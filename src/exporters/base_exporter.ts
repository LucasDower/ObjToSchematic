import { Vector3 } from '../vector';
import { BlockMesh } from '../block_mesh';

import { NBT, writeUncompressed } from 'prismarine-nbt';
import * as zlib from 'zlib';
import * as fs from 'fs';

export abstract class IExporter {
    protected _sizeVector!: Vector3;

    public abstract convertToNBT(blockMesh: BlockMesh): NBT
    abstract getFormatFilter(): Electron.FileFilter;
    abstract getFormatName(): string;
    abstract getFileExtension(): string;

    getFormatDisclaimer(): string | undefined {
        return;
    }

    export(blockMesh: BlockMesh, filePath: string): boolean {
        const bounds = blockMesh.getVoxelMesh()?.getBounds();
        this._sizeVector = Vector3.sub(bounds.max, bounds.min).addScalar(1);

        const nbt = this.convertToNBT(blockMesh);

        const outBuffer = fs.createWriteStream(filePath);
        const newBuffer = writeUncompressed(nbt, 'big');

        zlib.gzip(newBuffer, (err, buffer) => {
            if (!err) {
                outBuffer.write(buffer);
                outBuffer.end();
            }
            return err;
        });

        return false;
    }
}
