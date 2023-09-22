import fs from 'fs';
import path from 'path';

import { ObjImporter } from "../src/runtime/importers/obj_importer";
import { OtS_VoxelMesh_Converter } from '../src/runtime/ots_voxel_mesh_converter';
import { BlockMesh } from '../src/runtime/block_mesh';
import { PALETTE_ALL_RELEASE } from '../res/palettes/all';
import { createReadableStream, createOtSTexture } from './util';
import { TexturedMaterial } from 'src/runtime/materials';
import { ASSERT } from 'src/runtime/util/error_util';

(async () => {
    const pathModel = path.join(__dirname, '../res/samples/skull.obj');
    const readableStream = createReadableStream(pathModel);

    console.time('Mesh');
    const loader = new ObjImporter();
    const mesh = await loader.import(readableStream);
    console.timeEnd('Mesh');

    const pathTexture = path.join(__dirname, '../res/samples/skull.jpg');
    const texture = createOtSTexture(pathTexture);
    ASSERT(texture !== undefined, `Could not parse ${pathTexture}`);

    // Update the 'skull' material
    const success = mesh.setMaterial({
        type: 'textured',
        name: 'skull',
        texture: texture,
    });
    ASSERT(success, 'Could not update skull material');

    console.time('VoxelMesh');
    const converter = new OtS_VoxelMesh_Converter();
    converter.setConfig({
        constraintAxis: 'y',
        size: 380,
        multisampling: false,
        replaceMode: 'keep',
    });

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

    //console.log(mesh.getTriangleCount().toLocaleString(), 'triangles');
    //console.log(mesh.getMaterials());
    //console.log(voxelMesh.getVoxelCount().toLocaleString(), 'voxels');
})();