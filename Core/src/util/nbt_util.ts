import { NBT, writeUncompressed } from 'prismarine-nbt';
import pako from 'pako';

export function saveNBT(nbt: NBT) {
    const uncompressedBuffer = writeUncompressed(nbt, 'big');
    return pako.gzip(uncompressedBuffer);
}