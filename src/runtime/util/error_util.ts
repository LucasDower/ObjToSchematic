import { TLocalisedString } from '../../editor/localiser';

export class AppError extends Error {
    constructor(msg: TLocalisedString) {
        super(msg);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export function ASSERT(condition: any, errorMessage: string = 'Assertion Failed'): asserts condition {
    if (!condition) {
        Error(errorMessage);
        throw Error(errorMessage);
    }
}
