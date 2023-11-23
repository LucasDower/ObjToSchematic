import { clamp } from "ots-core/src/math";
import { Vector3 } from "ots-core/src/vector";

export class SmoothVariable {
    private _actual: number;
    private _target: number;
    private _smoothing: number;
    private _min: number;
    private _max: number;

    public constructor(value: number, smoothing: number) {
        this._actual = value;
        this._target = value;
        this._smoothing = smoothing;
        this._min = -Infinity;
        this._max = Infinity;
    }

    public setClamp(min: number, max: number) {
        this._min = min;
        this._max = max;
    }

    public addToTarget(delta: number) {
        this._target = clamp(this._target + delta, this._min, this._max);
    }

    public setTarget(target: number) {
        this._target = clamp(target, this._min, this._max);
    }

    public setActual(actual: number) {
        this._actual = actual;
    }

    public tick() {
        this._actual += (this._target - this._actual) * this._smoothing;
    }

    public getActual() {
        return this._actual;
    }

    public getTarget() {
        return this._target;
    }
}

export class SmoothVectorVariable {
    private _actual: Vector3;
    private _target: Vector3;
    private _smoothing: number;

    public constructor(value: Vector3, smoothing: number) {
        this._actual = value;
        this._target = value;
        this._smoothing = smoothing;
    }

    public addToTarget(delta: Vector3) {
        this._target = Vector3.add(this._target, delta);
    }

    public setTarget(target: Vector3) {
        this._target = target;
    }

    public tick() {
        this._actual.add(Vector3.sub(this._target, this._actual).mulScalar(this._smoothing));
    }

    public getActual() {
        return this._actual;
    }

    public getTarget() {
        return this._target;
    }
}