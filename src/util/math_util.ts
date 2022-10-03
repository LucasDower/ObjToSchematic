export namespace MathUtil {

    export function uint8(x: number) {
        return x & 0xFF;
    }

    export function int8(x: number) {
        return uint8(x + 0x80) - 0x80;
    }

    export function uint32(x: number) {
        return x >>> 0;
    }

    export function int32(x: number) {
        return uint32(x + 0x80000000) - 0x80000000;
    }
}
