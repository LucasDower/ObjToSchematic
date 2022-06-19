import { Vector3 } from '../src/vector';
import { VoxelMesh } from '../src/voxel_mesh';
import { ASSERT, RGB } from '../src/util';

test('Voxel neighbours', () => {
    const voxelMesh = new VoxelMesh({
        voxelOverlapRule: 'first',
        calculateNeighbours: true,
    });
    voxelMesh.addVoxel(new Vector3(1, 2, 3), RGB.white);

    expect(voxelMesh.getNeighbours(new Vector3(1, 2, 3)).value).toBe(0);

    // Even though this neighbour does exist, it is not calculated as
    // this relationship is never tested
    expect(voxelMesh.hasNeighbour(new Vector3(1, 2, 3).add(new Vector3(1, 0, 0)), new Vector3(-1, 0, 0))).toBe(false);

    expect(voxelMesh.hasNeighbour(new Vector3(1, 2, 3).add(new Vector3(1, 1, 0)), new Vector3(-1, -1, 0))).toBe(true);
    expect(voxelMesh.hasNeighbour(new Vector3(1, 2, 3).add(new Vector3(-1, -1, 0)), new Vector3(1, 1, 0))).toBe(true);
    expect(voxelMesh.hasNeighbour(new Vector3(1, 2, 3).add(new Vector3(1, -1, 1)), new Vector3(-1, 1, -1))).toBe(true);
    expect(voxelMesh.hasNeighbour(new Vector3(1, 2, 3).add(new Vector3(-1, 0, 1)), new Vector3(1, 0, -1))).toBe(true);
});

test('Add voxel', () => {
    const voxelMesh = new VoxelMesh({
        voxelOverlapRule: 'first',
        calculateNeighbours: true,
    });

    voxelMesh.addVoxel(new Vector3(1, 2, 3), RGB.red);

    expect(voxelMesh.isVoxelAt(new Vector3(1, 2, 3))).toBe(true);
    expect(voxelMesh.getVoxelCount()).toBe(1);
    const voxel = voxelMesh.getVoxelAt(new Vector3(1, 2, 3));
    expect(voxel).toBeDefined(); ASSERT(voxel);
    expect(voxel.position.equals(new Vector3(1, 2, 3))).toBe(true);
    expect(voxel.colour).toEqual(RGB.red);
});

test('Voxel overlap first', () => {
    const voxelMesh = new VoxelMesh({
        voxelOverlapRule: 'first',
        calculateNeighbours: false,
    });

    voxelMesh.addVoxel(new Vector3(1, 2, 3), RGB.red);
    voxelMesh.addVoxel(new Vector3(1, 2, 3), RGB.blue);

    expect(voxelMesh.getVoxelAt(new Vector3(1, 2, 3))?.colour).toEqual(RGB.red);
});

test('Voxel overlap average', () => {
    const voxelMesh = new VoxelMesh({
        voxelOverlapRule: 'average',
        calculateNeighbours: false,
    });

    voxelMesh.addVoxel(new Vector3(1, 2, 3), new RGB(1.0, 0.5, 0.25));
    voxelMesh.addVoxel(new Vector3(1, 2, 3), new RGB(0.0, 0.5, 0.75));

    expect(voxelMesh.getVoxelAt(new Vector3(1, 2, 3))?.colour).toEqual(new RGB(0.5, 0.5, 0.5));
});
