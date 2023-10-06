type MouseState = {
    x: number,
    y: number,
    buttons: number
}

export class MouseManager {
    private static readonly MOUSE_LEFT = 1;
    private static readonly MOUSE_RIGHT = 2;

    private prevMouse: MouseState;
    private currMouse: MouseState;

    private static _instance: MouseManager;

    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this.currMouse = { x: -1, y: -1, buttons: 0 };
        this.prevMouse = { x: -1, y: -1, buttons: 0 };
    }

    public init() {
        document.addEventListener('mousemove', (e) => {
            this.onMouseMove(e);
        });
    }

    public onMouseMove(e: MouseEvent) {
        this.currMouse = { x: e.clientX, y: e.clientY, buttons: e.buttons };
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
}
