import { RGBAColours } from '../src/runtime/colour';
import { ASSERT } from '../src/runtime/util/error_util';
import { Vector3 } from '../src/runtime/vector';
import { VoxelMesh } from '../src/runtime/voxel_mesh';
import { TEST_PREAMBLE } from './preamble';

test('Voxel neighbours', () => {
    TEST_PREAMBLE();

    const voxelMesh = new VoxelMesh({
        voxelOverlapRule: 'first',
        enableAmbientOcclusion: true,

    });
    voxelMesh.addVoxel(new Vector3(0, 0, 0), RGBAColours.WHITE);
    voxelMesh.addVoxel(new Vector3(1, 1, 0), RGBAColours.WHITE);
    voxelMesh.calculateNeighbours();

    expect(voxelMesh.hasNeighbour(new Vector3(0, 0, 0), new Vector3(1, 1, 0))).toBe(true);
    expect(voxelMesh.hasNeighbour(new Vector3(0, 0, 0), new Vector3(-1, -1, 0))).toBe(false);
    expect(voxelMesh.hasNeighbour(new Vector3(1, 1, 0), new Vector3(-1, -1, 0))).toBe(true);
    expect(voxelMesh.hasNeighbour(new Vector3(1, 1, 0), new Vector3(1, 1, 0))).toBe(false);
});

test('Add voxel', () => {
    const voxelMesh = new VoxelMesh({
        voxelOverlapRule: 'first',
        enableAmbientOcclusion: true,
    });

    voxelMesh.addVoxel(new Vector3(1, 2, 3), RGBAColours.RED);

    expect(voxelMesh.isVoxelAt(new Vector3(1, 2, 3))).toBe(true);
    expect(voxelMesh.getVoxelCount()).toBe(1);
    const voxel = voxelMesh.getVoxelAt(new Vector3(1, 2, 3));
    expect(voxel).toBeDefined(); ASSERT(voxel);
    expect(voxel.position.equals(new Vector3(1, 2, 3))).toBe(true);
    expect(voxel.colour).toEqual(RGBAColours.RED);
});

test('Voxel overlap first', () => {
    const voxelMesh = new VoxelMesh({
        voxelOverlapRule: 'first',
        enableAmbientOcclusion: false,
    });

    voxelMesh.addVoxel(new Vector3(1, 2, 3), RGBAColours.RED);
    voxelMesh.addVoxel(new Vector3(1, 2, 3), RGBAColours.BLUE);

    expect(voxelMesh.getVoxelAt(new Vector3(1, 2, 3))?.colour).toEqual(RGBAColours.RED);
});

test('Voxel overlap average', () => {
    const voxelMesh = new VoxelMesh({
        voxelOverlapRule: 'average',
        enableAmbientOcclusion: false,
    });

    voxelMesh.addVoxel(new Vector3(1, 2, 3), { r: 1.0, g: 0.5, b: 0.25, a: 1.0 });
    voxelMesh.addVoxel(new Vector3(1, 2, 3), { r: 0.0, g: 0.5, b: 0.75, a: 1.0 });

    expect(voxelMesh.getVoxelAt(new Vector3(1, 2, 3))?.colour).toEqual({ r: 0.5, g: 0.5, b: 0.5, a: 1.0 });
});
