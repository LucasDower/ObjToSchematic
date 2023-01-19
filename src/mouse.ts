import { Renderer } from './renderer';

interface MouseState {
    x: number,
    y: number,
    buttons: number
}

export class MouseManager {
    private _gl: WebGLRenderingContext;

    private static readonly MOUSE_LEFT = 1;
    private static readonly MOUSE_RIGHT = 2;

    private prevMouse: MouseState;
    private currMouse: MouseState;
    private lastMove: number;

    private static _instance: MouseManager;

    public static get Get() {
        return this._instance || (this._instance = new this(Renderer.Get._gl));
    }

    private constructor(gl: WebGLRenderingContext) {
        this._gl = gl;
        this.lastMove = 0;

        this.currMouse = { x: -1, y: -1, buttons: 0 };
        this.prevMouse = { x: -1, y: -1, buttons: 0 };
    }

    public onMouseMove(e: MouseEvent) {
            this.currMouse = { x: e.clientX, y: e.clientY, buttons: e.buttons };
            this.lastMove = Date.now();
    }

    public isMouseLeftDown() {
        this.currMouse.buttons & MouseManager.MOUSE_LEFT;
    }

    public isMouseRightDown() {
        this.currMouse.buttons & MouseManager.MOUSE_RIGHT;
    }

    public getMouseDelta() {
        const delta = {
            dx: this.currMouse.x - this.prevMouse.x,
            dy: -(this.currMouse.y - this.prevMouse.y),
        };
        this.prevMouse = this.currMouse;
        return delta;
    };

    public getMousePosNorm() {
        const normX =   2 * (this.currMouse.x / this._gl.canvas.width ) - 1;
        const normY = -(2 * (this.currMouse.y / this._gl.canvas.height) - 1);
        return { x: normX, y: normY };
    }
}
