import { TLocalisedString } from "../localiser";

export class AppError extends Error {
    constructor(msg: TLocalisedString) {
        super(msg);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}