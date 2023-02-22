import path from 'path';
import { NBT, writeUncompressed } from 'prismarine-nbt';
import zlib from 'zlib';

import { ASSERT } from './error_util';
import { download } from './file_util';

export function saveNBT(nbt: NBT, filepath: string) {
    const uncompressedBuffer = writeUncompressed(nbt, 'big');
    return zlib.gzipSync(uncompressedBuffer);
}
