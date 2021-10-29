import { Vector3 } from "./vector";


export const argMax = (array: [number]) => {
    return array.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
}

export const fastCrossXAxis = (vec: Vector3) => {
    return new Vector3(0.0, -vec.z, vec.y);
}

export const fastCrossYAxis = (vec: Vector3) => {
    return new Vector3(vec.z, 0.0, -vec.x);
}

export const fastCrossZAxis = (vec: Vector3) => {
    return new Vector3(-vec.y, vec.x, 0.0);
}

export const clamp = (value: number, min: number, max: number) => {
    return Math.max(Math.min(max, value), min);
}

export const triangleArea = (a: number, b: number, c: number) => {
    const p = (a + b + c) / 2;
    return Math.sqrt(p * (p - a) * (p - b) * (p - c));
}

export const xAxis = new Vector3(1.0, 0.0, 0.0);
export const yAxis = new Vector3(0.0, 1.0, 0.0);
export const zAxis = new Vector3(0.0, 0.0, 1.0);