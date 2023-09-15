import fs from 'fs';
import path from 'path';

import { ObjImporter } from "../src/runtime/importers/obj_importer";
import { OtS_VoxelMesh_Converter } from '../src/runtime/ots_voxel_mesh_converter';
import { BlockMesh } from '../src/runtime/block_mesh';
import { PALETTE_ALL_RELEASE } from '../res/palettes/all';

(async () => {
    const p = path.join(__dirname, '../res/samples/skull.obj');
    
    const readableStream = new ReadableStream({
        async start(controller) {
            try {
                const readStream = fs.createReadStream(p);
                
                readStream.on('data', (chunk) => {
                    controller.enqueue(chunk);
                });

                readStream.on('end', () => {
                    controller.close();
                });

                readStream.on('error', (err) => {
                    throw err;
                });
            } catch (error) {
                controller.error(error); // Signal an error if something goes wrong
            }
        },
    });


    const loader = new ObjImporter();
    console.time('Mesh');
    const mesh = await loader.import(readableStream);
    console.timeEnd('Mesh');

    const converter = new OtS_VoxelMesh_Converter();
    converter.setConfig({
        constraintAxis: 'y',
        size: 380,
        multisampling: true,
        replaceMode: 'average',
    });

    console.time('VoxelMesh');
    const voxelMesh = converter.process(mesh);
    console.timeEnd('VoxelMesh');

    console.time('BlockMesh');
    const blockMesh = BlockMesh.createFromVoxelMesh(voxelMesh, {
        atlasJSON: JSON.parse(fs.readFileSync(path.join(__dirname, '../res/atlases/vanilla.atlas'), 'utf8')),
        blockPalette: new Set(PALETTE_ALL_RELEASE),
        calculateLighting: false,
        contextualAveraging: true,
        dithering: 'off',
        ditheringMagnitude: 0,
        errorWeight: 0.02,
        resolution: 16,
        fallable: 'do-nothing',
        lightThreshold: 0,
    });
    console.timeEnd('BlockMesh');
})();