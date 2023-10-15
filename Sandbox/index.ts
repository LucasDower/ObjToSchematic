import fs from 'fs';

import { RGBAColours, RGBAUtil } from 'ots-core/src/colour';
import { OtS_Mesh } from 'ots-core/src/ots_mesh';
import { OtS_Texture } from 'ots-core/src/ots_texture';
import { OtS_VoxelMesh_Converter } from '../Core/src/ots_voxel_mesh_converter';
import { OtS_BlockMesh_Converter } from '../Core/src/ots_block_mesh_converter';
import { ExporterFactory } from '../Core/src/exporters/exporters';
import { ASSERT } from 'ots-core/src/util/error_util';

(async () => {
    const mesh = OtS_Mesh.create();
    {
        mesh.addSection({
            name: 'Test Section 1',
            type: 'solid',
            colour: RGBAUtil.copy(RGBAColours.WHITE),
            positionData: Float32Array.from([
                0.0, 0.0, 0.0,
                1.0, 2.0, 3.0,
                4.0, 5.0, 6.0,
            ]),
            normalData: Float32Array.from([
                0.0, 1.0, 0.0,
                0.0, 1.0, 0.0,
                0.0, 1.0, 0.0,
            ]),
            indexData: Uint32Array.from([
                0, 1, 2
            ]),
        });

        mesh.addSection({
            name: 'Test Section 2',
            type: 'colour',
            positionData: Float32Array.from([
                0.0, 10.0, 0.0,
                1.0, 12.0, 3.0,
                4.0, 15.0, 6.0,
            ]),
            normalData: Float32Array.from([
                0.0, 1.0, 0.0,
                0.0, 1.0, 0.0,
                0.0, 1.0, 0.0,
            ]),
            colourData: Float32Array.from([
                1.0, 0.0, 0.0, 1.0,  
                1.0, 0.0, 0.0, 1.0,  
                1.0, 0.0, 0.0, 1.0,    
            ]),
            indexData: Uint32Array.from([
                0, 1, 2
            ]),
        });

        mesh.addSection({
            name: 'Test Section 3',
            type: 'textured',
            texture: new OtS_Texture(new Uint8ClampedArray(), 0, 0, 'nearest', 'repeat'),
            positionData: Float32Array.from([
                0.0, 20.0, 0.0,
                1.0, 22.0, 3.0,
                4.0, 25.0, 6.0,
            ]),
            normalData: Float32Array.from([
                0.0, 1.0, 0.0,
                0.0, 1.0, 0.0,
                0.0, 1.0, 0.0,
            ]),
            texcoordData: Float32Array.from([
                0.0, 0.0,
                1.0, 0.0,
                0.0, 1.0,
            ]),
            indexData: Uint32Array.from([
                0, 1, 2
            ]),
        });
    }

    // 3. Construct a voxel mesh from the mesh
    const voxelMeshConverter = new OtS_VoxelMesh_Converter();
    voxelMeshConverter.setConfig({
        constraintAxis: 'y',
        size: 380,
        multisampling: false,
        replaceMode: 'keep',
    });

    const voxelMesh = voxelMeshConverter.process(mesh);

    // 4. Construct a block mesh from the block
    const blockMeshConverter = new OtS_BlockMesh_Converter();
    blockMeshConverter.setConfig({
        mode: {
            type: 'per-block', data: [
                { name: 'minecraft:stone', colour: RGBAUtil.copy(RGBAColours.WHITE) },
            ]
        },
    });

    const blockMesh = blockMeshConverter.process(voxelMesh);

    // 5. Export the block mesh to a file
    const exporter = ExporterFactory.GetExporter('uncompressed_json');
    const structure = exporter.export(blockMesh);
    ASSERT(structure.type === 'single');

    fs.writeFileSync('output.json', structure.content);
})();