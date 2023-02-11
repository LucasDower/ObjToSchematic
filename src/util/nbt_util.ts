import path from 'path';
//import { NBT, writeUncompressed } from 'prismarine-nbt';
import zlib from 'zlib';

import { ASSERT } from './error_util';

type NBT = {};

export function saveNBT(nbt: NBT, filepath: string) {
    // TODO Unimplemented
    /*
    ASSERT(path.isAbsolute(filepath), '[saveNBT]: filepath is not absolute');

    const uncompressedBuffer = writeUncompressed(nbt, 'big');
    const compressedBuffer = zlib.gzipSync(uncompressedBuffer);
    fs.writeFileSync(filepath, compressedBuffer);
    */
}
