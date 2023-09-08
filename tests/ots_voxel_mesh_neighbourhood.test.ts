import { EFaceVisibility } from '../src/runtime/block_assigner';
import { RGBAColours } from '../src/runtime/colour';
import { OtS_VoxelMesh, OtS_VoxelMesh_Neighbourhood } from '../src/runtime/ots_voxel_mesh';

test('VoxelMesh Neighbourhood #1', () => {
    const voxelMesh = new OtS_VoxelMesh();
    voxelMesh.addVoxel(0, 0, 0, RGBAColours.WHITE, 'replace');

    const neighbourhood = new OtS_VoxelMesh_Neighbourhood();
    neighbourhood.process(voxelMesh, 'cardinal');

    expect(neighbourhood.getFaceVisibility(0, 0, 0)).toBe(EFaceVisibility.Full);
});

test('VoxelMesh Neighbourhood #2', () => {
    const neighbourhood = new OtS_VoxelMesh_Neighbourhood();

    expect(neighbourhood.getFaceVisibility(0, 0, 0)).toBe(null);
});

test('VoxelMesh Neighbourhood #3', () => {
    const voxelMesh = new OtS_VoxelMesh();
    voxelMesh.addVoxel(0, 0, 0, RGBAColours.WHITE, 'replace');
    voxelMesh.addVoxel(0, 1, 0, RGBAColours.WHITE, 'replace');

    const neighbourhood = new OtS_VoxelMesh_Neighbourhood();
    neighbourhood.process(voxelMesh, 'cardinal');

    expect(neighbourhood.getFaceVisibility(0, 0, 0)).toBe(EFaceVisibility.Down | EFaceVisibility.North | EFaceVisibility.South | EFaceVisibility.East | EFaceVisibility.West);
    expect(neighbourhood.getFaceVisibility(0, 1, 0)).toBe(EFaceVisibility.Up | EFaceVisibility.North | EFaceVisibility.South | EFaceVisibility.East | EFaceVisibility.West);

    expect(neighbourhood.hasNeighbour(0, 0, 0, 0, 1, 0)).toBe(true);
    expect(neighbourhood.hasNeighbour(0, 1, 0, 0, -1, 0)).toBe(true);
});

test('VoxelMesh Neighbourhood #4', () => {
    const voxelMesh = new OtS_VoxelMesh();
    voxelMesh.addVoxel(0, 0, 0, RGBAColours.WHITE, 'replace');
    voxelMesh.addVoxel(1, 0, 0, RGBAColours.WHITE, 'replace');
    voxelMesh.addVoxel(0, 1, 0, RGBAColours.WHITE, 'replace');
    voxelMesh.addVoxel(0, 0, 1, RGBAColours.WHITE, 'replace');

    const neighbourhood = new OtS_VoxelMesh_Neighbourhood();
    neighbourhood.process(voxelMesh, 'cardinal');

    expect(neighbourhood.getFaceVisibility(0, 0, 0)).toBe(EFaceVisibility.Down | EFaceVisibility.South | EFaceVisibility.West);

    expect(neighbourhood.hasNeighbour(0, 0, 0, 1, 0, 0)).toBe(true);
    expect(neighbourhood.hasNeighbour(0, 0, 0, 0, 1, 0)).toBe(true);
    expect(neighbourhood.hasNeighbour(0, 0, 0, 0, 0, 1)).toBe(true);
});

test('VoxelMesh Neighbourhood #5', () => {
    const neighbourhood = new OtS_VoxelMesh_Neighbourhood();

    expect(neighbourhood.hasNeighbour(0, 0, 0, 1, 0, 0)).toBe(false);
    expect(neighbourhood.hasNeighbour(0, 0, 0, 0, 1, 0)).toBe(false);
    expect(neighbourhood.hasNeighbour(0, 0, 0, 0, 0, 1)).toBe(false);

    expect(neighbourhood.getFaceVisibility(0, 0, 0)).toBe(null);
});

test('VoxelMesh Neighbourhood #6', () => {
    const voxelMesh = new OtS_VoxelMesh();
    voxelMesh.addVoxel(0, 0, 0, RGBAColours.WHITE, 'replace');
    voxelMesh.addVoxel(1, 1, 1, RGBAColours.WHITE, 'replace');

    const neighbourhood = new OtS_VoxelMesh_Neighbourhood();
    neighbourhood.process(voxelMesh, 'non-cardinal');

    expect(neighbourhood.hasNeighbour(0, 0, 0, 1, 1, 1)).toBe(true);
    expect(neighbourhood.getFaceVisibility(0, 0, 0)).toBe(null);
});

test('VoxelMesh Neighbourhood #6', () => {
    // Checking a non-cardinal neighbour when processing using 'cardinal' mode
    const voxelMesh = new OtS_VoxelMesh();
    voxelMesh.addVoxel(0, 0, 0, RGBAColours.WHITE, 'replace');
    voxelMesh.addVoxel(1, 1, 1, RGBAColours.WHITE, 'replace');

    const neighbourhood = new OtS_VoxelMesh_Neighbourhood();
    neighbourhood.process(voxelMesh, 'cardinal');

    expect(neighbourhood.hasNeighbour(0, 0, 0, 1, 1, 1)).toBe(false);
    expect(neighbourhood.getFaceVisibility(0, 0, 0)).toBe(EFaceVisibility.Full);

    // Now use proper mode
    neighbourhood.process(voxelMesh, 'non-cardinal');
    expect(neighbourhood.hasNeighbour(0, 0, 0, 1, 1, 1)).toBe(true);
    expect(neighbourhood.getFaceVisibility(0, 0, 0)).toBe(null);
});

test('VoxelMesh Neighbourhood #6', () => {
    // Checking a cardinal neighbour when processing using 'non-cardinal' mode
    const voxelMesh = new OtS_VoxelMesh();
    voxelMesh.addVoxel(0, 0, 0, RGBAColours.WHITE, 'replace');
    voxelMesh.addVoxel(1, 0, 0, RGBAColours.WHITE, 'replace');

    const neighbourhood = new OtS_VoxelMesh_Neighbourhood();
    neighbourhood.process(voxelMesh, 'non-cardinal');

    expect(neighbourhood.hasNeighbour(0, 0, 0, 1, 0, 0)).toBe(false);
    expect(neighbourhood.getFaceVisibility(0, 0, 0)).toBe(null);

    // Now use proper mode
    neighbourhood.process(voxelMesh, 'cardinal');
    expect(neighbourhood.hasNeighbour(0, 0, 0, 1, 0, 0)).toBe(true);
    expect(neighbourhood.getFaceVisibility(0, 0, 0)).toBe(EFaceVisibility.Up | EFaceVisibility.Down | EFaceVisibility.South | EFaceVisibility.East | EFaceVisibility.West);
});