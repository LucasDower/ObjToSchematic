import { AppContext } from "./app_context";
import { Schematic, Litematic } from "./schematic";
import { remote } from "electron"; 

const context = new AppContext();

function handleFileLoad() {
    const files = remote.dialog.showOpenDialogSync({
        title: "Load Waveform .obj file",
        buttonLabel: "Load",
        filters: [{
            name: 'Waveform obj file',
            extensions: ['obj']
        }]
    });

    if (files) {
        context.load(files);
    }
}


$("#buttonChooseFile").on("click", () => {
    handleFileLoad();
});

$("#inputFile").on("click", () => {
    handleFileLoad();
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