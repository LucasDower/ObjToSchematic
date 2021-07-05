const { m4, v3: Vector3 } = require('twgl.js');
const mouseHandler = require('./mouse.js');
const mathUtil = require('./math.js');

class ArcballCamera {

    constructor(fov, aspect, zNear, zFar) {
        this.fov = fov * Math.PI / 180;
        this.aspect = aspect;
        this.zNear = zNear;
        this.zFar = zFar;

        this.actualDistance = 15.0;
        this.actualAzimuth = 0.6;
        this.actualElevation = 1.3;

        this.cameraSmoothing = 0.025;

        this.targetDistance = this.actualDistance;
        this.targetAzimuth = this.actualAzimuth;
        this.targetElevation = this.actualElevation;

        this.updateCameraPosition();

        this.target = [0, 0, 0];
        this.up = [0, 1, 0];

        this.mouseSensitivity = 0.005;
        this.scrollSensitivity = 0.005;

        this.zoomDistMin = 2.0;
        this.zoomDistMax = 100.0;

        this.isRotating = false;
    }

    updateCamera() {
        if (!this.isRotating) {
            return;
        }

        const mouseDelta = mouseHandler.getMouseDelta();
        this.targetAzimuth += mouseDelta.dx * this.mouseSensitivity;
        this.targetElevation += mouseDelta.dy * this.mouseSensitivity;

        // Prevent the camera going upside-down
        const eps = 0.01;
        this.targetElevation = Math.max(Math.min(Math.PI - eps, this.targetElevation), eps);

        this.updateCameraPosition();
    }

    handleScroll(e) {
        this.targetDistance += e.deltaY * this.scrollSensitivity;
        this.targetDistance = Math.max(Math.min(this.zoomDistMax, this.targetDistance), this.zoomDistMin);

        this.updateCameraPosition();
    }

    updateCameraPosition() {
        this.actualDistance += (this.targetDistance - this.actualDistance) * 2 * this.cameraSmoothing;

        this.actualAzimuth += (this.targetAzimuth - this.actualAzimuth) * this.cameraSmoothing;
        this.actualElevation += (this.targetElevation - this.actualElevation) * this.cameraSmoothing;

        this.eye = [
            this.actualDistance * Math.cos(this.actualAzimuth) * -Math.sin(this.actualElevation),
            this.actualDistance * Math.cos(this.actualElevation),
            this.actualDistance * Math.sin(this.actualAzimuth) * -Math.sin(this.actualElevation)
        ];
    }

    getCameraPosition(azimuthOffset, elevationOffset) {
        const azimuth = this.actualAzimuth + azimuthOffset;
        const elevation = this.actualElevation + elevationOffset;
        return [
            this.actualDistance * Math.cos(azimuth ) * -Math.sin(elevation),
            this.actualDistance * Math.cos(elevation),
            this.actualDistance * Math.sin(azimuth) * -Math.sin(elevation)
        ];
    }

    getProjectionMatrix() {
        return m4.perspective(this.fov, this.aspect, this.zNear, this.zFar);
    }

    getCameraMatrix() {
        return m4.lookAt(this.eye, this.target, this.up);
    }

    getViewMatrix() {
        return m4.inverse(this.getCameraMatrix());
    }

    getViewProjection() {
        return m4.multiply(this.getProjectionMatrix(), this.getViewMatrix());
    }

    getWorldMatrix() {
        return m4.identity();
    }

    getWorldViewProjection() {
        return m4.multiply(this.getViewProjection(), this.getWorldMatrix());
    }

    getWorldInverseTranspose() {
        return m4.transpose(m4.inverse(this.getWorldMatrix()));
    }

    getInverseWorldViewProjection() {
        return m4.inverse(this.getWorldViewProjection());
    }

    getMouseRay() {
        const mousePos = mouseHandler.getMousePosNorm();
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

}


module.exports.ArcballCamera = ArcballCamera;