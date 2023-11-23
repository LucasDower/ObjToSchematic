import { AppMath } from "../math";

export namespace OtS_ArrayUtil {

    export function findFirstTrueIndex(length: number, valueAt: (index: number) => boolean) {
        let low = 0;
        let high = length - 1;
        let result = -1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);

            if (valueAt(mid) === true) {
                result = mid;
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }

        return result;
    }

    /**
     * An optimised function for repeating a subarray contained within a buffer multiple times by
     * repeatedly doubling the subarray's length.
     */
    export function repeatedFill(buffer: Float32Array, start: number, startLength: number, desiredCount: number) {
        const pow = AppMath.largestPowerOfTwoLessThanN(desiredCount);

        let len = startLength;
        for (let i = 0; i < pow; ++i) {
            buffer.copyWithin(start + len, start, start + len);
            len *= 2;
        }

        const finalLength = desiredCount * startLength;
        buffer.copyWithin(start + len, start, start + finalLength - len);
    }

}