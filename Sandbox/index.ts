import { strict as assert } from 'node:assert';
import path from 'node:path';
import OTS from 'ots-core';

import { createOtSTexture, createReadableStream } from './src/util';

(async () => {
    // 1. Import a mesh
    const pathModel = path.join(__dirname, '../res/samples/skull.obj');
    const readableStream = createReadableStream(pathModel);

    const importer = OTS.getImporter('obj');
    const mesh = await importer.import(readableStream);

    // 2. Assign materials
    const pathTexture = path.join(__dirname, '../res/samples/skull.jpg');
    const texture = createOtSTexture(pathTexture);
    assert(texture !== undefined, `Could not parse ${pathTexture}`);

    // Update the 'skull' material
    const success = mesh.setMaterial({
        type: 'textured',
        name: 'skull',
        texture: texture,
    });
    assert(success, 'Could not update skull material');

    // 3. Construct a voxel mesh from the mesh
    const converter = new OTS.voxelMeshConverter();
    converter.setConfig({
        constraintAxis: 'y',
        size: 380,
        multisampling: false,
        replaceMode: 'keep',
    });

    const voxelMesh = converter.process(mesh);

    // 4. Construct a block mesh from the block
    // TODO

    // 5. Export the block mesh to a file
    // TODO
})();