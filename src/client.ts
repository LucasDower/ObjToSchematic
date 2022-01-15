import { Schematic, Litematic } from "./schematic";
import { AppContext } from "./app_context";
import { ArcballCamera } from "./camera";
import { MouseManager } from "./mouse";

function AddEvent(htmlElementID: string, event: string, delegate: (e: any) => void) {
    document.getElementById(htmlElementID)?.addEventListener(event, delegate);
}

// Register Events
/*
AddEvent("buttonChooseFile", "click",       () => { context.do(Action.Load); });
AddEvent("inputFile",        "click",       () => { context.do(Action.Load); });
AddEvent("buttonVoxelise",   "click",       () => { context.do(Action.Voxelise); });
AddEvent("buttonSchematic",  "click", async () => { context.do(Action.ExportSchematic); });
AddEvent("buttonLitematic",  "click", async () => { context.do(Action.ExportLitematic); });
*/

const camera = ArcballCamera.Get;
AddEvent("canvas", "mousedown", (e) => { camera.onMouseDown(e); });
AddEvent("canvas", "mouseup",   (e) => { camera.onMouseUp(e); });
AddEvent("canvas", "wheel",     (e) => { camera.onWheelScroll(e); });

const mouseManager = MouseManager.Get;
AddEvent("canvas", "mousemove", (e) => { mouseManager.onMouseMove(e); });


// Begin draw loop
const context = AppContext.Get;
function render() {
    context.draw();
    requestAnimationFrame(render);
}
requestAnimationFrame(render);