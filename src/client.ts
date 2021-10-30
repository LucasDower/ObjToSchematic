import { Schematic, Litematic } from "./schematic";
import { AppContext } from "./app_context";
import { ArcballCamera } from "./camera";
import { MouseManager } from "./mouse";

function AddEvent(htmlElementID: string, event: string, delegate: (e: any) => void) {
    document.getElementById(htmlElementID)?.addEventListener(event, delegate);
}

// Register Events
const context = AppContext.Get;
AddEvent("buttonChooseFile", "click",       () => { context.load(); });
AddEvent("inputFile",        "click",       () => { context.load(); });
AddEvent("buttonVoxelise",   "click",       () => { context.voxeliseDisclaimer(); });
AddEvent("buttonSchematic",  "click", async () => { context.exportDisclaimer(new Schematic()); });
AddEvent("buttonLitematic",  "click", async () => { context.exportDisclaimer(new Litematic()); });

const camera = ArcballCamera.Get;
AddEvent("canvas", "mousedown", (e) => { camera.onMouseDown(e); });
AddEvent("canvas", "mouseup",   (e) => { camera.onMouseUp(e); });
AddEvent("canvas", "wheel",     (e) => { camera.onWheelScroll(e); });

const mouseManager = MouseManager.Get;
AddEvent("canvas", "mousemove", (e) => { mouseManager.onMouseMove(e); });

// Begin draw loop
function render() {
    context.draw();
    requestAnimationFrame(render);
}
requestAnimationFrame(render);