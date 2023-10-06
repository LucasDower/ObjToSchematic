import fs from 'fs';
import path from 'path';

import { ObjImporter } from "../src/importers/obj_importer";
import { OtS_VoxelMesh_Converter } from '../src/ots_voxel_mesh_converter';
import { BlockMesh } from '../src/block_mesh';
import { PALETTE_ALL_RELEASE } from '../../Editor/res/palettes/all'; // TODO: Disallowed import
import { ExporterFactory } from '../src/exporters/exporters';
import { ASSERT } from '../src/util/error_util';
import { createReadableStream, createOtSTexture } from '../tools/util'; // TODO: Disallowed import

(async () => {
    // 1. Import a mesh
    const pathModel = path.join(__dirname, '../res/samples/skull.obj');
    const readableStream = createReadableStream(pathModel);

    const loader = new ObjImporter();
    const mesh = await loader.import(readableStream);

    // 2. Assign materials
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

    // 3. Construct a voxel mesh from the mesh
    const converter = new OtS_VoxelMesh_Converter();
    converter.setConfig({
        constraintAxis: 'y',
        size: 380,
        multisampling: false,
        replaceMode: 'keep',
    });

    const voxelMesh = converter.process(mesh);

    // 4. Construct a block mesh from the block
    // NOTE: This will be placeholder and will be changed
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

    // 5. Export the block mesh to a file
    // NOTE: This will be placeholder and will be changed
    const exporter = ExporterFactory.GetExporter('litematic');
    const exportData = exporter.export(blockMesh.blockMesh);

    if (exportData.type === 'single') {
        fs.writeFileSync('export' + exportData.extension, exportData.content);
    } else {
        exportData.regions.forEach((region) => {
            fs.writeFileSync(region.name + exportData.extension, region.content);
        });
    }
})();