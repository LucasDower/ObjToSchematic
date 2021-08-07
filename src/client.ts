import { AppContext } from "./dist/app_context.js";

const { AppContext } = require('./dist/app_context.js');

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
    context.handleExport();
});


function render(time) {
    context.draw();
    requestAnimationFrame(render);
}

requestAnimationFrame(render);