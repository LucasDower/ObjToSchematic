import { NBT, writeUncompressed } from 'prismarine-nbt';
import pako from 'pako';

export function ASSERT(condition: any, errorMessage: string = 'Assertion Failed'): asserts condition {
    if (!condition) {
        Error(errorMessage);
        throw Error(errorMessage);
    }
}

// TODO: Move to Editor
export enum EAction {
    Settings = 0,
    Import = 1,
    Materials = 2,
    Voxelise = 3,
    Assign = 4,
    Export = 5,
    MAX = 6,
}

export namespace OtS_Util {

    export namespace Regex {
        /** Regex for non-zero whitespace */
        export const REGEX_NZ_WS = /[ \t]+/;

        /** Regex for number */
        export const REGEX_NUMBER = /[0-9eE+\.\-]+/;

        export const REGEX_NZ_ANY = /.+/;

        export function regexCapture(identifier: string, regex: RegExp) {
            return new RegExp(`(?<${identifier}>${regex.source}`);
        }

        export function regexOptional(regex: RegExp) {
            return new RegExp(`(${regex})?`);
        }

        export function buildRegex(...args: (string | RegExp)[]) {
            return new RegExp(args.map((r) => {
                if (r instanceof RegExp) {
                    return r.source;
                }
                return r;
            }).join(''));
        }

        export class RegExpBuilder {
            private _components: string[];

            public constructor() {
                this._components = [];
            }

            public add(item: string | RegExp, capture?: string, optional: boolean = false): RegExpBuilder {
                let regex: string;
                if (item instanceof RegExp) {
                    regex = item.source;
                } else {
                    regex = item;
                }
                if (capture) {
                    regex = `(?<${capture}>${regex})`;
                }
                if (optional) {
                    regex = `(${regex})?`;
                }
                this._components.push(regex);
                return this;
            }

            public addMany(items: (string | RegExp)[], optional: boolean = false): RegExpBuilder {
                let toAdd: string = '';
                for (const item of items) {
                    if (item instanceof RegExp) {
                        toAdd += item.source;
                    } else {
                        toAdd += item;
                    }
                }
                this._components.push(optional ? `(${toAdd})?` : toAdd);
                return this;
            }

            public addNonzeroWhitespace(): RegExpBuilder {
                this.add(REGEX_NZ_WS);
                return this;
            }

            public toRegExp(): RegExp {
                return new RegExp(this._components.join(''));
            }
        }
    }

    export namespace Text {
        export function capitaliseFirstLetter(text: string) {
            return text.charAt(0).toUpperCase() + text.slice(1);
        }

        /**
         * Namespaces a block name if it is not already namespaced
         * For example `namespaceBlock('stone')` returns `'minecraft:stone'`
         */
        export function namespaceBlock(blockName: string): string {
            // https://minecraft.fandom.com/wiki/Resource_location#Namespaces
            return isNamespacedBlock(blockName) ? blockName : ('minecraft:' + blockName);
        }

        export function isNamespacedBlock(blockName: string): boolean {
            return blockName.includes(':');
        }
    }

    export namespace Numeric {
        export const RADIANS_0 = 0.0;
        export const RADIANS_90 = 1.5708;
        export const RADIANS_180 = 3.14159;
        export const RADIANS_270 = 4.71239;

        export function getRandomID(): string {
            return (Math.random() + 1).toString(36).substring(7);
        }

        export function uint8(x: number) {
            return x & 0xFF;
        }

        export function int8(x: number) {
            return uint8(x + 0x80) - 0x80;
        }

        export function uint32(x: number) {
            return x >>> 0;
        }

        export function int32(x: number) {
            return uint32(x + 0x80000000) - 0x80000000;
        }

        export function lerp(value: number, start: number, end: number) {
            return (1 - value) * start + value * end;
        }

        export function nearlyEqual(a: number, b: number, tolerance: number = 0.0001) {
            return Math.abs(a - b) < tolerance;
        }

        export function degreesToRadians(degrees: number) {
            return degrees * (Math.PI / 180.0);
        }

        export function largestPowerOfTwoLessThanN(n: number) {
            return Math.floor(Math.log2(n));
        }


        export const argMax = (array: [number]) => {
            return array.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
        };

        export const clamp = (value: number, min: number, max: number) => {
            return Math.max(Math.min(max, value), min);
        };

        export const floorToNearest = (value: number, base: number) => {
            return Math.floor(value / base) * base;
        };

        export const ceilToNearest = (value: number, base: number) => {
            return Math.ceil(value / base) * base;
        };

        export const roundToNearest = (value: number, base: number) => {
            return Math.round(value / base) * base;
        };

        export const between = (value: number, min: number, max: number) => {
            return min <= value && value <= max;
        };

        export const mapRange = (value: number, fromMin: number, fromMax: number, toMin: number, toMax: number) => {
            return (value - fromMin) / (fromMax - fromMin) * (toMax - toMin) + toMin;
        };

        export const wayThrough = (value: number, min: number, max: number) => {
            // ASSERT(value >= min && value <= max);
            return (value - min) / (max - min);
        };

        /**
         * Returs true if any number in args is NaN
         */
        export const anyNaN = (...args: number[]) => {
            return args.some((arg) => {
                return isNaN(arg);
            });
        };
    }

    export namespace Array {
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

        /**
         * An optimised function for repeating a subarray contained within a buffer multiple times by
         * repeatedly doubling the subarray's length.
         */
        export function repeatedFill(buffer: Float32Array, start: number, startLength: number, desiredCount: number) {
            const pow = Numeric.largestPowerOfTwoLessThanN(desiredCount);

            let len = startLength;
            for (let i = 0; i < pow; ++i) {
                buffer.copyWithin(start + len, start, start + len);
                len *= 2;
            }

            const finalLength = desiredCount * startLength;
            buffer.copyWithin(start + len, start, start + finalLength - len);
        }
    }

    export namespace NBT {
        export function saveNBT(nbt: NBT) {
            const uncompressedBuffer = writeUncompressed(nbt, 'big');
            return pako.gzip(uncompressedBuffer);
        }
    }

}