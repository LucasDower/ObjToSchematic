import { AppContext } from './app_context';
import { ArcballCamera } from './camera';
import { MouseManager } from './mouse';

function addEvent(htmlElementID: string, event: string, delegate: (e: any) => void) {
    document.getElementById(htmlElementID)?.addEventListener(event, delegate);
}

const camera = ArcballCamera.Get;
addEvent('canvas', 'mousedown', (e) => {
    camera.onMouseDown(e);
});
addEvent('canvas', 'mouseup',   (e) => {
    camera.onMouseUp(e);
});
addEvent('canvas', 'wheel',     (e) => {
    camera.onWheelScroll(e);
});

const mouseManager = MouseManager.Get;
addEvent('canvas', 'mousemove', (e) => {
    mouseManager.onMouseMove(e);
});


// Begin draw loop
const context = AppContext.Get;
function render() {
    context.draw();
    requestAnimationFrame(render);
}
requestAnimationFrame(render);
