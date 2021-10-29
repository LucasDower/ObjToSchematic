import { AppContext } from "./app_context";
import { ExportFormat } from "./app_context";
import { ArcballCamera } from "./camera";
import { MouseManager } from "./mouse";

function AddEvent(htmlElementID: string, event: string, delegate: (e: any) => void) {
    document.getElementById(htmlElementID)?.addEventListener(event, delegate);
}

// Register Events
const context = AppContext.Get;
AddEvent("loadBtn",         "click",       () => { context.load(); });
AddEvent("voxelBtn",        "click",       () => { context.voxeliseDisclaimer(); });
AddEvent("exportBtn",       "click",       () => { context.export(); });
AddEvent("exportSchematic", "click", async () => { context.exportDisclaimer(ExportFormat.SCHEMATIC); });
AddEvent("exportLitematic", "click", async () => { context.exportDisclaimer(ExportFormat.LITEMATIC); });

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