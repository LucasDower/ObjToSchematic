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
        element.classList.remove('style-inactive-disabled');
        element.classList.remove('style-inactive-enabled');
        element.classList.remove('style-inactive-hover');
        element.classList.remove('style-active-disabled');
        element.classList.remove('style-active-enabled');
        element.classList.remove('style-active-hover');
    }

    export function updateStyles(element: HTMLElement, style: TStyleParams) {
        clearStyles(element);

        let styleToApply = `style`;

        styleToApply += style.isActive ? '-active' : '-inactive';

        if (style.isEnabled) {
            if (style.isHovered) {
                styleToApply += '-hover';
            } else {
                styleToApply += '-enabled';
            }
        } else {
            styleToApply += '-disabled';
        }

        element.classList.add(styleToApply);
    }
}
