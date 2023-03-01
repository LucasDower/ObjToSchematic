import { ASSERT } from './error_util';

export namespace UIUtil {
    export function getElementById(id: string) {
        const element = document.getElementById(id);
        //ASSERT(element !== null, `Attempting to getElement of nonexistent element: ${id}`);
        return element as HTMLElement;
    }
}
