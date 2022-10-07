export class AppError extends Error {
    constructor(msg: string) {
        super(msg);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export function ASSERT(condition: any, errorMessage = 'Assertion Failed'): asserts condition {
    if (!condition) {
        Error(errorMessage);
        throw Error(errorMessage);
    }
}
