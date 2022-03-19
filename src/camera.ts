import { m4, v3 } from 'twgl.js';
import { MouseManager } from './mouse';
import { degreesToRadians } from './math';
import { Renderer } from './renderer';
import { SmoothVariable, SmoothVectorVariable } from './util';
import { Vector3 } from './vector';

export class ArcballCamera {
    public isUserRotating = false;
    public isUserTranslating = false;

    private readonly fov: number;
    private readonly zNear: number;
    private readonly zFar: number;
    public aspect: number;
    
    private _distance = new SmoothVariable(18.0, 0.025);
    private _azimuth = new SmoothVariable(-1.0, 0.025);
    private _elevation = new SmoothVariable(1.3, 0.025);
    private _target = new SmoothVectorVariable(new Vector3(0, 0, 0), 0.025);

    private readonly up: v3.Vec3 = [0, 1, 0];
    private eye: v3.Vec3 = [0, 0, 0];

    private mouseSensitivity = 0.005;
    private scrollSensitivity = 0.005;

    private gl: WebGLRenderingContext;

    private static _instance: ArcballCamera;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this.fov = 30 * degreesToRadians;
        this.zNear = 0.5;
        this.zFar = 100.0;
        this.gl = Renderer.Get._gl;
        this.aspect = this.gl.canvas.width / this.gl.canvas.height;

        this._elevation.setClamp(0.01, Math.PI - 0.01);
        this._distance.setClamp(1.0, 100.0);
    }

    public updateCamera() {
        this.aspect = this.gl.canvas.width / this.gl.canvas.height;

        const mouseDelta = MouseManager.Get.getMouseDelta();
        if (this.isUserRotating) {
            this._azimuth.addToTarget(mouseDelta.dx * this.mouseSensitivity);
            this._elevation.addToTarget(mouseDelta.dy * this.mouseSensitivity);
        }
        if (this.isUserTranslating) {
            const my = mouseDelta.dy * this.mouseSensitivity;
            const mx = mouseDelta.dx * this.mouseSensitivity;
            // Up-down
            const dy = -Math.cos(this._elevation.getTarget() - Math.PI/2);
            const df = Math.sin(this._elevation.getTarget() - Math.PI/2);
            this._target.addToTarget(new Vector3(
                -Math.sin(this._azimuth.getTarget() - Math.PI/2) * my * df,
                dy * my,
                Math.cos(this._azimuth.getTarget() - Math.PI/2) * my * df,
            ));
            // Left-right
            const dx =  Math.sin(this._azimuth.getTarget());
            const dz = -Math.cos(this._azimuth.getTarget());
            this._target.addToTarget(new Vector3(dx * mx, 0.0, dz * mx));
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

    getCameraPosition(azimuthOffset: number, elevationOffset: number) {
        const azimuth = this._azimuth.getActual() + azimuthOffset;
        const elevation = this._elevation.getActual() + elevationOffset;
        return [
            this._distance.getActual() * Math.cos(azimuth ) * -Math.sin(elevation),
            this._distance.getActual() * Math.cos(elevation),
            this._distance.getActual() * Math.sin(azimuth) * -Math.sin(elevation),
        ];
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
        this._distance.addToTarget(e.deltaY * this.scrollSensitivity);
    }

    public getProjectionMatrix() {
        return m4.perspective(this.fov, this.aspect, this.zNear, this.zFar);
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
