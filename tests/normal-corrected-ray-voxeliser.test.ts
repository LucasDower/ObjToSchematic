import { NormalCorrectedRayVoxeliser } from '../src/voxelisers/normal-corrected-ray-voxeliser';
import { ObjImporter } from '../src/importers/obj_importer';
import { TextureFiltering } from '../src/texture';
import { ASSERT } from '../src/util';
import { Vector3 } from '../src/vector';

import path from 'path';
import { RGBAColours } from '../src/colour';

test('Voxelise solid 2x2 cube', () => {
    const importer = new ObjImporter();
    importer.parseFile(path.join(__dirname, './data/cube.obj'));
    const mesh = importer.toMesh();
    mesh.processMesh();

    const voxeliser = new NormalCorrectedRayVoxeliser();
    const voxelMesh = voxeliser.voxelise(mesh, {
        desiredHeight: 2,
        useMultisampleColouring: false,
        textureFiltering: TextureFiltering.Nearest,
        enableAmbientOcclusion: false,
    });

    const expectedVoxels = [
        {
            position: new Vector3(0, 1, 0),
            colour: RGBAColours.BLUE,
        },
        {
            position: new Vector3(1, 1, 0),
            colour: RGBAColours.GREEN,
        },
        {
            position: new Vector3(1, 1, 1),
            colour: RGBAColours.RED,
        },
        {
            position: new Vector3(0, 1, 1),
            colour: RGBAColours.WHITE,
        },
        {
            position: new Vector3(1, 0, 1),
            colour: RGBAColours.YELLOW,
        },
        {
            position: new Vector3(1, 0, 0),
            colour: RGBAColours.CYAN,
        },
        {
            position: new Vector3(0, 0, 1),
            colour: RGBAColours.BLACK,
        },
        {
            position: new Vector3(0, 0, 0),
            colour: RGBAColours.MAGENTA,
        },
    ];

    for (const expected of expectedVoxels) {
        expect(voxelMesh.isVoxelAt(expected.position)).toBe(true);
        const voxel = voxelMesh.getVoxelAt(expected.position);
        expect(voxel).toBeDefined(); ASSERT(voxel);
        expect(voxel.colour.r).toBeCloseTo(expected.colour.r);
        expect(voxel.colour.g).toBeCloseTo(expected.colour.g);
        expect(voxel.colour.b).toBeCloseTo(expected.colour.b);
        expect(voxel.colour.a).toBeCloseTo(expected.colour.a);
    }
});
