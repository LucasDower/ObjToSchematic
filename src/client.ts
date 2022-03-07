import { AppContext } from './app_context';
import { ArcballCamera } from './camera';
import { MouseManager } from './mouse';
import { LOG } from './util';

function addEvent(htmlElementID: string, event: string, delegate: (e: any) => void) {
    document.getElementById(htmlElementID)?.addEventListener(event, delegate);
}

function addDocumentEvent(event: string, delegate: (e: any) => void) {
    document.addEventListener(event, delegate);
}

const camera = ArcballCamera.Get;
addEvent('canvas', 'mousedown', (e) => {
    LOG('mousedown');
    camera.onMouseDown(e);
});
addDocumentEvent('mouseup',   (e) => {
    LOG('mouseup');
    camera.onMouseUp(e);
});
addEvent('canvas', 'wheel',     (e) => {
    camera.onWheelScroll(e);
});

const mouseManager = MouseManager.Get;
addDocumentEvent('mousemove', (e) => {
    mouseManager.onMouseMove(e);
});


// Begin draw loop
const context = new AppContext();
function render() {
    context.draw();
    requestAnimationFrame(render);
}
requestAnimationFrame(render);
