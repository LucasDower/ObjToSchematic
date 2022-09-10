import { Vector3 } from "./vector";

/**
 * A 3D cuboid volume defined by two opposing corners
 */
 export class Bounds {
    private _min: Vector3;
    private _max: Vector3;

    constructor(min: Vector3, max: Vector3) {
        this._min = min;
        this._max = max;
    }

    public extendByPoint(point: Vector3) {
        this._min = Vector3.min(this._min, point);
        this._max = Vector3.max(this._max, point);
    }

    public extendByVolume(volume: Bounds) {
        this._min = Vector3.min(this._min, volume._min);
        this._max = Vector3.max(this._max, volume._max);
    }

    public static getInfiniteBounds() {
        return new Bounds(
            new Vector3(Infinity, Infinity, Infinity),
            new Vector3(-Infinity, -Infinity, -Infinity),
        );
    }

    public get min() {
        return this._min;
    }

    public get max() {
        return this._max;
    }

    public getCentre() {
        const extents = Vector3.sub(this._max, this._min).divScalar(2);
        return Vector3.add(this.min, extents);
    }

    public getDimensions() {
        return Vector3.sub(this._max, this._min);
    }
}