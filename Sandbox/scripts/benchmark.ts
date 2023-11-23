import path from 'node:path';

import { OtS_Importer_Obj } from 'ots-core/src/importers/obj_importer';
import { createOtSTexture, createReadableStream } from '../src/util';
import { ASSERT } from 'ots-core/src/util/util';
import { OtS_VoxelMesh_Converter } from 'ots-core/src/ots_voxel_mesh_converter';
import { OtS_BlockMesh_Converter } from 'ots-core/src/ots_block_mesh_converter';
import { BLOCK_DATA_DEFAULT } from 'ots-core/src/ots_block_data_default';

(async () => {
    const pathModel = path.join(__dirname, '../../Editor/res/samples/skull.obj');
    const readableStream = createReadableStream(pathModel);

    console.time('Mesh');
    const loader = new OtS_Importer_Obj();
    const mesh = await loader.import(readableStream);
    console.timeEnd('Mesh');

    const pathTexture = path.join(__dirname, '../res/samples/skull.jpg');
    const texture = createOtSTexture(pathTexture);
    ASSERT(texture !== undefined, `Could not parse ${pathTexture}`);

    // Update the 'skull' material
    /*
    const success = mesh.mo({
        type: 'textured',
        name: 'skull',
        texture: texture,
    });
    ASSERT(success, 'Could not update skull material');
    */

    console.time('VoxelMesh');
    const voxelMeshConverter = new OtS_VoxelMesh_Converter();
    voxelMeshConverter.setConfig({
        constraintAxis: 'y',
        size: 380,
        replaceMode: 'keep',
    });

    const voxelMesh = voxelMeshConverter.process(mesh);
    console.timeEnd('VoxelMesh');


    console.time('BlockMesh');
    const blockMeshConverter = new OtS_BlockMesh_Converter();
    blockMeshConverter.setConfig({
        mode: { type: 'per-block', data: BLOCK_DATA_DEFAULT.PER_BLOCK },
        dithering: null,
        smoothness: null,
        fallable: 'replace-falling',
        resolution: 128,
    });

    const blockMesh = blockMeshConverter.process(voxelMesh);
    console.timeEnd('BlockMesh');
})();