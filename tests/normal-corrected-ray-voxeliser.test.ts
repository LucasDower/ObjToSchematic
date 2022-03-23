import { NormalCorrectedRayVoxeliser } from '../src/voxelisers/normal-corrected-ray-voxeliser';
import { ObjImporter } from '../src/importers/obj_importer';
import { TextureFiltering } from '../src/texture';
import { ASSERT, RGB } from '../src/util';
import { Vector3 } from '../src/vector';

import path from 'path';

test('Parse vertex #1', () => {
    const importer = new ObjImporter();
    importer.parseFile(path.join(__dirname, './data/cube.obj'));
    const mesh = importer.toMesh();
    mesh.processMesh();

    const voxeliser = new NormalCorrectedRayVoxeliser();
    const voxelMesh = voxeliser.voxelise(mesh, {
        desiredHeight: 2,
        useMultisampleColouring: false,
        textureFiltering: TextureFiltering.Nearest,
        ambientOcclusionEnabled: false,
    });

    const expectedVoxels = [
        {
            position: new Vector3(0, 1, 0),
            colour: new RGB(0, 0, 1),
        },
        {
            position: new Vector3(1, 1, 0),
            colour: new RGB(0, 1, 0),
        },
        {
            position: new Vector3(1, 1, 1),
            colour: new RGB(1, 0, 0),
        },
        {
            position: new Vector3(0, 1, 1),
            colour: new RGB(1, 1, 1),
        },
        {
            position: new Vector3(1, 0, 1),
            colour: new RGB(1, 1, 0),
        },
        {
            position: new Vector3(1, 0, 0),
            colour: new RGB(0, 1, 1),
        },
        {
            position: new Vector3(0, 0, 1),
            colour: new RGB(0, 0, 0),
        },
        {
            position: new Vector3(0, 0, 0),
            colour: new RGB(1, 0, 1),
        },
    ];

    for (const expected of expectedVoxels) {
        expect(voxelMesh.isVoxelAt(expected.position)).toBe(true);
        const voxel = voxelMesh.getVoxelAt(expected.position);
        expect(voxel).toBeDefined(); ASSERT(voxel);
        expect(voxel.colour.toVector3().equals(expected.colour.toVector3()));
    }
});
