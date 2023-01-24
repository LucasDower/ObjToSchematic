import fs from 'fs';
import path from 'path';
import { NBT, writeUncompressed } from 'prismarine-nbt';
import zlib from 'zlib';

import { ASSERT } from './error_util';

export namespace NBTUtil {
    export function save(nbt: NBT, filepath: string) {
        ASSERT(path.isAbsolute(filepath), '[saveNBT]: filepath is not absolute');

        const uncompressedBuffer = writeUncompressed(nbt, 'big');
        const compressedBuffer = zlib.gzipSync(uncompressedBuffer);
        fs.writeFileSync(filepath, compressedBuffer);
    }

}
