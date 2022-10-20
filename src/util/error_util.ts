import { TLocString } from './type_util';
export class AppError extends Error {
    public locMsg: TLocString;

    constructor(msg: string) {
        super(msg);
        this.locMsg = msg as TLocString; // FIXME
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export function ASSERT(condition: any, errorMessage = 'Assertion Failed'): asserts condition {
    if (!condition) {
        Error(errorMessage);
        throw Error(errorMessage);
    }
}
