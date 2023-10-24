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