import { PathUtil } from './util/path_util';

export namespace AppUtil {
    export namespace Text {
        export function capitaliseFirstLetter(text: string) {
            return text.charAt(0).toUpperCase() + text.slice(1);
        }

        /** 
         * Namespaces a block name if it is not already namespaced
         * For example `namespaceBlock('stone')` returns `'minecraft:stone'`
         */
        export function namespaceBlock(blockName: string): AppTypes.TNamespacedBlockName {
            // https://minecraft.fandom.com/wiki/Resource_location#Namespaces
            return blockName.includes(':') ? blockName : ('minecraft:' + blockName);
        }
    }
}

/* eslint-disable */
export enum EAction {
    Import = 0,
    Simplify = 1,
    Voxelise = 2,
    Assign = 3,
    Export = 4,
    MAX = 5,
}
/* eslint-enable */

export namespace AppTypes {
    export type TNamespacedBlockName = string;
}

export class UV {
    public u: number;
    public v: number;

    constructor(u: number, v: number) {
        this.u = u;
        this.v = v;
    }

    public copy() {
        return new UV(this.u, this.v);
    }
}

/* eslint-disable */
export enum ColourSpace {
    RGB,
    LAB
}
/* eslint-enable */

export type TOptional<T> = T | undefined;


export const BASE_DIR = PathUtil.join(__dirname, '/../../');
export const RESOURCES_DIR = PathUtil.join(BASE_DIR, './res/');
export const ATLASES_DIR = PathUtil.join(RESOURCES_DIR, './atlases');
export const PALETTES_DIR = PathUtil.join(RESOURCES_DIR, './palettes/');
export const STATIC_DIR = PathUtil.join(RESOURCES_DIR, './static/');
export const SHADERS_DIR = PathUtil.join(RESOURCES_DIR, './shaders/');
export const TOOLS_DIR = PathUtil.join(BASE_DIR, './tools/');
export const TESTS_DATA_DIR = PathUtil.join(BASE_DIR, './tests/data/');

export function getRandomID(): string {
    return (Math.random() + 1).toString(36).substring(7);
}