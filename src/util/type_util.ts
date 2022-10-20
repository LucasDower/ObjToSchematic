export type TBrand<K, T> = K & { __brand: T };

/** Explicit type for localised strings, use LOC.t to turn string to TLocString */
export type TLocString = TBrand<string, 'LOC'>;

export type TToggle = 'on' | 'off';

export type TTextureFiltering = 'linear' | 'nearest';
