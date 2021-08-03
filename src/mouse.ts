interface MouseInfo {
    x: number,
    y: number,
    buttons: number
}

export class MouseManager {

    private _gl: WebGLRenderingContext;

    private static readonly MOUSE_LEFT = 1;
    private static readonly MOUSE_RIGHT = 2;

    private prevMouse: MouseInfo;
    private currMouse: MouseInfo;

    constructor(gl: WebGLRenderingContext) {
        this._gl = gl;

        this.currMouse = { x: -1, y: -1, buttons: 0 };
        this.prevMouse = { x: -1, y: -1, buttons: 0 };
    }

    public handleInput(e: MouseEvent) {
        this.prevMouse = this.currMouse;
        this.currMouse = { x: e.clientX, y: e.clientY, buttons: e.buttons };
    }

    public isMouseLeftDown() {
        this.currMouse.buttons & MouseManager.MOUSE_LEFT;
    }

    public isMouseRightDown() {
        this.currMouse.buttons & MouseManager.MOUSE_RIGHT;
    }

    public getMouseDelta() {
        return {
            dx:    this.currMouse.x - this.prevMouse.x,
            dy:  -(this.currMouse.y - this.prevMouse.y)
        };
    };

    public getMousePosNorm() {
        const normX =   2 * (this.currMouse.x / this._gl.canvas.width ) - 1;
        const normY = -(2 * (this.currMouse.y / this._gl.canvas.height) - 1);
        return { x: normX, y: normY };
    }

}