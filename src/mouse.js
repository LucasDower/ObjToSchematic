const gl = document.querySelector("#c").getContext("webgl");

var currentMouse =  { x: -1, y: -1, buttons: 0 };
var previousMouse = { x: -1, y: -1, buttons: 0 };

const MOUSE_LEFT = 1;
const MOUSE_RIGHT = 2;

module.exports = {

    handleInput: (e) => {
        previousMouse = currentMouse;
        currentMouse = { x: e.clientX, y: e.clientY, buttons: e.buttons };
    },

    isMouseLeftDown: () => {
        return currentMouse.buttons & MOUSE_LEFT;
    },

    isMouseRightDown: () => {
        return currentMouse.buttons & MOUSE_RIGHT;
    },

    getMouseDelta: () => {
        return {
            dx:    currentMouse.x - previousMouse.x,
            dy:  -(currentMouse.y - previousMouse.y)
        };
    },

    getMousePosNorm: () => {
        let normX = 2 * (currentMouse.x / gl.canvas.width) - 1;
        let normY = -(2 * (currentMouse.y / gl.canvas.height) - 1);
        return { x: normX, y: normY };
    },

};