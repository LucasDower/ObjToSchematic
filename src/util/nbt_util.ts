import { NBT, writeUncompressed } from 'prismarine-nbt';
import zlib from 'zlib';

export function saveNBT(nbt: NBT) {
    const uncompressedBuffer = writeUncompressed(nbt, 'big');
    return zlib.gzipSync(uncompressedBuffer);
}
