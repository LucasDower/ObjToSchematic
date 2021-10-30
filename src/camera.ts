import { m4, v3 } from "twgl.js";
import { MouseManager } from "./mouse";
import { degreesToRadians, clamp } from "./math";
import { Renderer } from "./renderer";

export class ArcballCamera {

    public isUserRotating = false;

    private readonly fov: number;
    private readonly zNear: number;
    private readonly zFar: number;
    private readonly cameraSmoothing = 0.025;
    
    public aspect: number;
    private actualDistance = 18.0;
    private actualAzimuth = -1.0;
    private actualElevation = 1.3;

    private targetDistance: number;
    private targetAzimuth: number;
    private targetElevation: number;

    private readonly target: v3.Vec3 = [0, 0, 0];
    private readonly up: v3.Vec3 = [0, 1, 0];
    private eye: v3.Vec3 = [0, 0, 0];

    private mouseSensitivity = 0.005;
    private scrollSensitivity = 0.005;

    private zoomDistMin = 1.0;
    private zoomDistMax = 100.0;

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

        this.targetDistance = this.actualDistance;
        this.targetAzimuth = this.actualAzimuth;
        this.targetElevation = this.actualElevation;
    }

    public updateCamera() {
        this.aspect = this.gl.canvas.width / this.gl.canvas.height;
        
        // Update target location if user is rotating camera
        if (this.isUserRotating) {
            const mouseDelta = MouseManager.Get.getMouseDelta();
            this.targetAzimuth += mouseDelta.dx * this.mouseSensitivity;
            this.targetElevation += mouseDelta.dy * this.mouseSensitivity;

            // Prevent the camera going upside-down
            const eps = 0.01;
            this.targetElevation = Math.max(Math.min(Math.PI - eps, this.targetElevation), eps);
        }

        // Move camera towards target location
        this.actualDistance  += (this.targetDistance  - this.actualDistance ) * this.cameraSmoothing;
        this.actualAzimuth   += (this.targetAzimuth   - this.actualAzimuth  ) * this.cameraSmoothing;
        this.actualElevation += (this.targetElevation - this.actualElevation) * this.cameraSmoothing;

        this.eye = [
            this.actualDistance * Math.cos(this.actualAzimuth) * -Math.sin(this.actualElevation),
            this.actualDistance * Math.cos(this.actualElevation),
            this.actualDistance * Math.sin(this.actualAzimuth) * -Math.sin(this.actualElevation)
        ];
    }

    getCameraPosition(azimuthOffset: number, elevationOffset: number) {
        const azimuth = this.actualAzimuth + azimuthOffset;
        const elevation = this.actualElevation + elevationOffset;
        return [
            this.actualDistance * Math.cos(azimuth ) * -Math.sin(elevation),
            this.actualDistance * Math.cos(elevation),
            this.actualDistance * Math.sin(azimuth) * -Math.sin(elevation)
        ];
    }

    public onMouseDown(e: MouseEvent) {
        this.isUserRotating = true;
    }

    public onMouseUp(e: MouseEvent) {
        this.isUserRotating = false;
    }

    public onWheelScroll(e: WheelEvent) {
        this.targetDistance += e.deltaY * this.scrollSensitivity;
        this.targetDistance = clamp(this.targetDistance, this.zoomDistMin, this.zoomDistMax);
    }

    public getProjectionMatrix() {
        return m4.perspective(this.fov, this.aspect, this.zNear, this.zFar);
    }

    public getCameraMatrix() {
        return m4.lookAt(this.eye, this.target, this.up);
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