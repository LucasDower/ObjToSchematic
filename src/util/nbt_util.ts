import fs from 'fs';
import path from 'path';
import { NBT, writeUncompressed } from 'prismarine-nbt';
import zlib from 'zlib';

import { ASSERT } from './error_util';

export function saveNBT(nbt: NBT, filepath: string) {
    ASSERT(path.isAbsolute(filepath), '[saveNBT]: filepath is not absolute');

    const outBuffer = fs.createWriteStream(filepath);
    const newBuffer = writeUncompressed(nbt, 'big');

    zlib.gzip(newBuffer, (err, buffer) => {
        if (!err) {
            outBuffer.write(buffer);
            outBuffer.end();
        }
        return err;
    });
}
