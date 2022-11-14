export type TBrand<K, T> = K & { __brand: T };

export type Vector3Hash = TBrand<number, 'Vector3Hash'>;

export type TDithering = 'off' | 'random' | 'ordered';

export type TToggle = 'on' | 'off';
