const mouseHandler = require('./mouse.js');

function registerCanvasEvents(gl, camera) {

    gl.canvas.addEventListener('mousedown', (e) => {
        camera.isRotating = true;
    });

    gl.canvas.addEventListener('mouseup', (e) => {
        camera.isRotating = false;
    });

    gl.canvas.addEventListener('mousemove', (e) => {
        mouseHandler.handleInput(e);
        camera.updateCamera();
    });

    gl.canvas.addEventListener('wheel', (e) => {
        camera.handleScroll(e);
    });

}

module.exports.registerCanvasEvents = registerCanvasEvents;