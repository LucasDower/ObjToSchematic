export function ASSERT(condition: any, errorMessage: string = 'Assertion Failed'): asserts condition {
    if (!condition) {
        Error(errorMessage);
        throw Error(errorMessage);
    }
}
