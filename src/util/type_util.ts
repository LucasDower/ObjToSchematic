export type TBrand<K, T> = K & { __brand: T };

export type Vector3Hash = TBrand<number, 'Vector3Hash'>;

export type TDithering = 'off' | 'random' | 'ordered';

export type TAxis = 'x' | 'y' | 'z';

export type TTexelExtension = 'repeat' | 'clamp';

export type TTexelInterpolation = 'nearest' | 'linear';

export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;
