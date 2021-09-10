import { AppContext } from "./app_context";
import { ExportFormat } from "./app_context";

const context = new AppContext();


$("#loadBtn").on("click", () => {
    context.load();
});


$("#voxelBtn").on("click", () => {
    context.voxeliseDisclaimer();
});


/*
$("#splitBtn").on("click", () => {
    context.split();
});
*/


$("#exportBtn").on("click", async () => {
    context.export();
});


$("#exportSchematic").on("click", async () => {
    context.exportDisclaimer(ExportFormat.SCHEMATIC);
});

$("#exportLitematic").on("click", async () => {
    context.exportDisclaimer(ExportFormat.LITEMATIC);
});


function render(time: number) {
    context.draw();
    requestAnimationFrame(render);
}

requestAnimationFrame(render);