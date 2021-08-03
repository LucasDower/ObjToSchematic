import { MouseManager } from "./mouse";
import { ArcballCamera } from "./camera";


export class EventManager {

    public static registerCanvasEvents(gl: WebGLRenderingContext, camera: ArcballCamera, mouse: MouseManager) {

        gl.canvas.addEventListener('mousedown', (e) => {
            camera.isRotating = true;
        });
    
        gl.canvas.addEventListener('mouseup', (e) => {
            camera.isRotating = false;
        });
    
        gl.canvas.addEventListener('mousemove', function (e: Event) {
            mouse.handleInput(<MouseEvent> e);
            camera.updateCamera();
        });
    
        gl.canvas.addEventListener('wheel', (e: Event) => {
            camera.handleScroll(<WheelEvent> e);
        });
    
    }

}