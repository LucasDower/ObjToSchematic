import { ASSERT } from './error_util';

export type TStyleParams = {
    isHovered: boolean,
    isEnabled: boolean,
    isActive: boolean,
}

export namespace UIUtil {
    export function getElementById(id: string) {
        const element = document.getElementById(id);
        ASSERT(element !== null, `Attempting to getElement of nonexistent element: ${id}`);
        return element as HTMLElement;
    }

    export function clearStyles(element: HTMLElement) {
        element.classList.remove('disabled');
        element.classList.remove('hover');
        element.classList.remove('active');
    }

    export function updateStyles(element: HTMLElement, style: TStyleParams) {
        clearStyles(element);

        if (style.isActive) {
            element.classList.add('active');
        }

        if (!style.isEnabled) {
            element.classList.add('disabled');
        }

        if (style.isHovered && style.isEnabled) {
            element.classList.add('hover');
        }
    }
}
