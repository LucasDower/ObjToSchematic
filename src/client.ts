import { AppContext } from "./app_context";
import { Schematic, Litematic } from "./schematic";

const context = new AppContext();


$("#buttonChooseFile").on("click", () => {
    context.load();
});

$("#inputFile").on("click", () => {
    context.load();
});

$("#buttonVoxelise").on("click", () => {
    context.voxelise();
});

$("#buttonSchematic").on("click", async () => {
    context.exportDisclaimer(new Schematic());
});

$("#buttonLitematic").on("click", async () => {
    context.exportDisclaimer(new Litematic());
});


function render(time: number) {
    context.draw();
    requestAnimationFrame(render);
}

requestAnimationFrame(render);