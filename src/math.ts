import { Vector3 } from './vector';


export const argMax = (array: [number]) => {
    return array.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
};

export const fastCrossXAxis = (vec: Vector3) => {
    return new Vector3(0.0, -vec.z, vec.y);
};

export const fastCrossYAxis = (vec: Vector3) => {
    return new Vector3(vec.z, 0.0, -vec.x);
};

export const fastCrossZAxis = (vec: Vector3) => {
    return new Vector3(-vec.y, vec.x, 0.0);
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

export const degreesToRadians = Math.PI / 180;
