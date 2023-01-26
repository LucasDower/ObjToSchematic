import { m4, v3 } from 'twgl.js';

import { AppConfig } from './config';
import { AppMath, between, clamp, degreesToRadians, roundToNearest, SmoothVariable, SmoothVectorVariable } from './math';
import { MouseManager } from './mouse';
import { Renderer } from './renderer';
import { Vector3 } from './vector';

export class ArcballCamera {
    public isUserRotating = false;
    public isUserTranslating = false;

    private _isPerspective: boolean;
    private _fov: number;
    private _zNear: number;
    private _zFar: number;
    private _aspect: number;
    private _sliceHeight: number;

    private _distance: SmoothVariable;// = new SmoothVariable(this._defaultDistance, 0.025);
    private _azimuth: SmoothVariable;// = new SmoothVariable(this._defaultAzimuth, 0.025);
    private _elevation: SmoothVariable;// = new SmoothVariable(this._defaultElevation, 0.025);
    private _target: SmoothVectorVariable;// = new SmoothVectorVariable(new Vector3(0, 0, 0), 0.025);

    private readonly up: v3.Vec3 = [0, 1, 0];
    private eye: v3.Vec3 = [0, 0, 0];

    private _azimuthRelief = 0.0;
    private _elevationRelief = 0.0;
    private _isAngleSnapped = false;

    private _gl: WebGLRenderingContext;

    private static _instance: ArcballCamera;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._gl = Renderer.Get._gl;

        this._isPerspective = true;
        this._fov = AppConfig.Get.CAMERA_FOV_DEGREES * degreesToRadians;
        this._zNear = 0.5;
        this._zFar = 100.0;
        this._aspect = this._gl.canvas.width / this._gl.canvas.height;
        this._distance = new SmoothVariable(AppConfig.Get.CAMERA_DEFAULT_DISTANCE_UNITS, AppConfig.Get.CAMERA_SMOOTHING);
        this._azimuth = new SmoothVariable(AppConfig.Get.CAMERA_DEFAULT_AZIMUTH_RADIANS, AppConfig.Get.CAMERA_SMOOTHING);
        this._elevation = new SmoothVariable(AppConfig.Get.CAMERA_DEFAULT_ELEVATION_RADIANS, AppConfig.Get.CAMERA_SMOOTHING);
        this._target = new SmoothVectorVariable(new Vector3(0, 0, 0), AppConfig.Get.CAMERA_SMOOTHING);
        this._sliceHeight = 0;

        this._elevation.setClamp(0.001, Math.PI - 0.001);
        this._distance.setClamp(1.0, 100.0);

        this.setCameraMode(this._isPerspective ? 'perspective' : 'orthographic');
    }

    public isPerspective() {
        return this._isPerspective;
    }

    public isOrthographic() {
        return !this._isPerspective;
    }

    public isAlignedWithAxis(axis: 'x' | 'y' | 'z'): boolean {
        const azimuth = Math.abs(this._azimuth.getTarget() % (Math.PI * 2));
        const elevation = this._elevation.getTarget();

        switch (axis) {
            case 'x':
                return AppMath.nearlyEqual(azimuth, AppMath.RADIANS_0) || AppMath.nearlyEqual(azimuth, AppMath.RADIANS_180);
            case 'y':
                return AppMath.nearlyEqual(elevation, AppMath.RADIANS_0, 0.002) || AppMath.nearlyEqual(elevation, AppMath.RADIANS_180, 0.002);
            case 'z':
                return AppMath.nearlyEqual(azimuth, AppMath.RADIANS_90) || AppMath.nearlyEqual(azimuth, AppMath.RADIANS_270);
        }
    }

    public setCameraMode(mode: 'perspective' | 'orthographic') {
        this._isPerspective = mode === 'perspective';
    }

    public setSliceHeight(sliceHeight: number) {
        this._sliceHeight = sliceHeight;
    }

    public getSliceHeight(): number {
        return this._sliceHeight;
    }

    private _angleSnap = false;
    public toggleAngleSnap() {
        this._angleSnap = !this._angleSnap;

        if (!this._angleSnap) {
            this._isAngleSnapped = false;
            this._azimuthRelief = 0.0;
            this._elevationRelief = 0.0;
        }
    }
    public isAngleSnapEnabled() {
        return this._angleSnap;
    }

    public updateCamera() {
        this._aspect = this._gl.canvas.width / this._gl.canvas.height;

        const mouseDelta = MouseManager.Get.getMouseDelta();
        mouseDelta.dx *= AppConfig.Get.CAMERA_SENSITIVITY_ROTATION;
        mouseDelta.dy *= AppConfig.Get.CAMERA_SENSITIVITY_ROTATION;

        if (this.isUserRotating) {
            this._azimuth.addToTarget(mouseDelta.dx);
            this._elevation.addToTarget(mouseDelta.dy);
        }
        if (this.isUserTranslating) {
            const my = mouseDelta.dy;
            const mx = mouseDelta.dx;
            // Up-down
            const dy = -Math.cos(this._elevation.getTarget() - Math.PI / 2);
            const df = Math.sin(this._elevation.getTarget() - Math.PI / 2);
            this._target.addToTarget(new Vector3(
                -Math.sin(this._azimuth.getTarget() - Math.PI / 2) * my * df,
                dy * my,
                Math.cos(this._azimuth.getTarget() - Math.PI / 2) * my * df,
            ));
            // Left-right
            const dx = Math.sin(this._azimuth.getTarget());
            const dz = -Math.cos(this._azimuth.getTarget());
            this._target.addToTarget(new Vector3(dx * mx, 0.0, dz * mx));
        }

        const axisSnapRadius = clamp(AppConfig.Get.ANGLE_SNAP_RADIUS_DEGREES, 0.0, 90.0) * degreesToRadians;

        if (this._shouldSnapCameraAngle()) {
            let shouldSnapToAzimuth = false;
            let shouldSnapToElevation = false;
            let snapAngleAzimuth = 0.0;
            let snapAngleElevation = 0.0;

            const azimuth = this._azimuth.getTarget();
            const elevation = this._elevation.getTarget();

            const modAzimuth = Math.abs(azimuth % (90 * degreesToRadians));

            if (modAzimuth < axisSnapRadius || modAzimuth > (90 * degreesToRadians - axisSnapRadius)) {
                shouldSnapToAzimuth = true;
                snapAngleAzimuth = roundToNearest(azimuth, 90 * degreesToRadians);
            }

            const elevationSnapPoints = [0, 90, 180].map((x) => x * degreesToRadians);
            for (const elevationSnapPoint of elevationSnapPoints) {
                if (elevationSnapPoint - axisSnapRadius <= elevation && elevation <= elevationSnapPoint + axisSnapRadius) {
                    shouldSnapToElevation = true;
                    snapAngleElevation = elevationSnapPoint;
                    break;
                }
            }

            if (shouldSnapToAzimuth && shouldSnapToElevation) {
                this._azimuth.setTarget(snapAngleAzimuth);
                this._elevation.setTarget(snapAngleElevation);
                this._isAngleSnapped = true;
            }
        }

        /*
        if (this.isOrthographic()) {
            const azimuth0 = between(this._azimuth.getTarget(), 0.0 - axisSnapRadius, 0.0 + axisSnapRadius);
            const azimuth90 = between(this._azimuth.getTarget(), Math.PI/2 - axisSnapRadius, Math.PI/2 + axisSnapRadius);
            const azimuth180 = between(this._azimuth.getTarget(), Math.PI - axisSnapRadius, Math.PI + axisSnapRadius);
            const azimuth270 = between(this._azimuth.getTarget(), 3*Math.PI/2 - axisSnapRadius, 3*Math.PI/2 + axisSnapRadius);

            const elevationTop = between(this._elevation.getTarget(), 0.0 - axisSnapRadius, 0.0 + axisSnapRadius);
            const elevationMiddle = between(this._elevation.getTarget(), Math.PI/2 - axisSnapRadius, Math.PI/2 + axisSnapRadius);
            const elevationBottom = between(this._elevation.getTarget(), Math.PI - axisSnapRadius, Math.PI + axisSnapRadius);

            if (elevationMiddle) {
                if (azimuth0) {
                    this._azimuth.setTarget(0);
                    this._elevation.setTarget(Math.PI/2);
                    this._isAngleSnapped = true;
                } else if (azimuth90) {
                    this._azimuth.setTarget(90);
                    this._elevation.setTarget(Math.PI/2);
                    this._isAngleSnapped = true;
                } else if (azimuth180) {
                    this._azimuth.setTarget(180);
                    this._elevation.setTarget(Math.PI/2);
                    this._isAngleSnapped = true;
                } else if (azimuth270) {
                    this._azimuth.setTarget(270);
                    this._elevation.setTarget(Math.PI/2);
                    this._isAngleSnapped = true;
                }
            }
        }
        */

        if (this._isAngleSnapped && this.isUserRotating) {
            this._azimuthRelief += mouseDelta.dx;
            this._elevationRelief += mouseDelta.dy;

            if (!between(this._azimuthRelief, -axisSnapRadius, axisSnapRadius) || !between(this._elevationRelief, -axisSnapRadius, axisSnapRadius)) {
                this._azimuth.setTarget(this._azimuth.getTarget() + this._azimuthRelief * 2);
                this._elevation.setTarget(this._elevation.getTarget() + this._elevationRelief * 2);
                this._isAngleSnapped = false;
            }
        }

        if (!this._isAngleSnapped) {
            this._azimuthRelief = 0.0;
            this._elevationRelief = 0.0;
        }

        // Move camera towards target location
        this._distance.tick();
        this._azimuth.tick();
        this._elevation.tick();
        this._target.tick();

        const target = this._target.getActual().toArray();
        this.eye = [
            this._distance.getActual() * Math.cos(this._azimuth.getActual()) * -Math.sin(this._elevation.getActual()) + target[0],
            this._distance.getActual() * Math.cos(this._elevation.getActual()) + target[1],
            this._distance.getActual() * Math.sin(this._azimuth.getActual()) * -Math.sin(this._elevation.getActual()) + target[2],
        ];
    }

    private _shouldSnapCameraAngle() {
        return this.isOrthographic() && this._angleSnap;
    }

    getCameraPosition(azimuthOffset: number, elevationOffset: number): Vector3 {
        const azimuth = this._azimuth.getActual() + azimuthOffset;
        const elevation = this._elevation.getActual() + elevationOffset;
        return new Vector3(
            this._distance.getActual() * Math.cos(azimuth) * -Math.sin(elevation),
            this._distance.getActual() * Math.cos(elevation),
            this._distance.getActual() * Math.sin(azimuth) * -Math.sin(elevation),
        );
    }

    public getCameraDirection(): Vector3 {
        return this.getCameraPosition(0.0, 0.0)
            .sub(this._target.getActual())
            .normalise();
    }

    public onMouseDown(e: MouseEvent) {
        if (e.buttons === 1) {
            this.isUserRotating = true;
        } else if (e.buttons === 2) {
            this.isUserTranslating = true;
        }
    }

    public onMouseUp(e: MouseEvent) {
        this.isUserRotating = false;
        this.isUserTranslating = false;
    }

    public onWheelScroll(e: WheelEvent) {
        this._distance.addToTarget(e.deltaY * AppConfig.Get.CAMERA_SENSITIVITY_ZOOM);
    }

    public getProjectionMatrix() {
        if (this._isPerspective) {
            return m4.perspective(this._fov, this._aspect, this._zNear, this._zFar);
        } else {
            const zoom = this._distance.getActual() / 3.6;
            return m4.ortho(-zoom * this._aspect, zoom * this._aspect, -zoom, zoom, -1000, 1000);
        }
    }

    public getCameraMatrix() {
        return m4.lookAt(this.eye, this._target.getActual().toArray(), this.up);
    }

    public getViewMatrix() {
        return m4.inverse(this.getCameraMatrix());
    }

    public getViewProjection() {
        return m4.multiply(this.getProjectionMatrix(), this.getViewMatrix());
    }

    public getWorldMatrix() {
        return m4.identity();
    }

    public getWorldViewProjection() {
        return m4.multiply(this.getViewProjection(), this.getWorldMatrix());
    }

    public getWorldInverseTranspose() {
        return m4.transpose(m4.inverse(this.getWorldMatrix()));
    }

    public getInverseWorldViewProjection() {
        return m4.inverse(this.getWorldViewProjection());
    }

    public onZoomOut() {
        this._distance.addToTarget(1);
    }

    public onZoomIn() {
        this._distance.addToTarget(-1);
    }

    public reset() {
        this._target.setTarget(new Vector3(0, 0, 0));
        this._distance.setTarget(AppConfig.Get.CAMERA_DEFAULT_DISTANCE_UNITS);
        this._azimuth.setTarget(AppConfig.Get.CAMERA_DEFAULT_AZIMUTH_RADIANS);
        this._elevation.setTarget(AppConfig.Get.CAMERA_DEFAULT_ELEVATION_RADIANS);

        while (this._azimuth.getActual() < AppConfig.Get.CAMERA_DEFAULT_AZIMUTH_RADIANS - Math.PI) {
            this._azimuth.setActual(this._azimuth.getActual() + Math.PI * 2);
        }
        while (this._azimuth.getActual() > AppConfig.Get.CAMERA_DEFAULT_ELEVATION_RADIANS + Math.PI) {
            this._azimuth.setActual(this._azimuth.getActual() - Math.PI * 2);
        }
    }

    public getAspect() {
        return this._aspect;
    }

    public setAspect(aspect: number) {
        this._aspect = aspect;
    }

    /*
    public getMouseRay() {
        const mousePos = this.mouseManager.getMousePosNorm();
        const inverseProjectionMatrix = this.getInverseWorldViewProjection();
        var origin = mathUtil.multiplyMatVec4(inverseProjectionMatrix, [mousePos.x, mousePos.y, -1.0, 1.0]);
        var dest = mathUtil.multiplyMatVec4(inverseProjectionMatrix, [mousePos.x, mousePos.y, 1.0, 1.0]);

        origin[0] /= origin[3];
        origin[1] /= origin[3];
        origin[2] /= origin[3];
        dest[0] /= dest[3];
        dest[1] /= dest[3];
        dest[2] /= dest[3];

        return {origin: origin, dest: dest};
    }
    */
}


module.exports.ArcballCamera = ArcballCamera;
