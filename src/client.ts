import { AppContext } from "./app_context";

const context = new AppContext();


$("#loadBtn").on("click", () => {
    context.load();
});


$("#voxelBtn").on("click", () => {
    context.voxelise();
});


/*
$("#splitBtn").on("click", () => {
    context.split();
});
*/


$("#exportBtn").on("click", async () => {
    context.export();
});


function render(time: number) {
    context.draw();
    requestAnimationFrame(render);
}

requestAnimationFrame(render);