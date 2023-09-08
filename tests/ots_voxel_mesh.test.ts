import { OtS_VoxelMesh } from '../src/runtime/ots_voxel_mesh';
import { ASSERT } from '../src/runtime/util/error_util';
import { Vector3 } from '../src/runtime/vector';

test('VoxelMesh #1', () => {
    const voxelMesh = new OtS_VoxelMesh();
    expect(voxelMesh.getVoxelCount()).toBe(0);
    expect(voxelMesh.getVoxelAt(0, 0, 0)).toBe(null);
});

test('VoxelMesh #2', () => {
    const voxelMesh = new OtS_VoxelMesh();
    voxelMesh.addVoxel(1, 2, 3, { r: 1.0, g: 0.5, b: 0.25, a: 0.125 }, 'keep');
    expect(voxelMesh.getVoxelCount()).toBe(1);
    expect(voxelMesh.isVoxelAt(1, 2, 3)).toBe(true);
    expect(voxelMesh.isOpaqueVoxelAt(1, 2, 3)).toBe(false);

    voxelMesh.addVoxel(-6, -6, -6, { r: 1.0, g: 1.0, b: 1.0, a: 1.0 }, 'keep');
    expect(voxelMesh.getVoxelCount()).toBe(2);
    expect(voxelMesh.isVoxelAt(-6, -6, -6)).toBe(true);
    expect(voxelMesh.isOpaqueVoxelAt(-6, -6, -6)).toBe(true);
});

test('VoxelMesh #3', () => {
    const voxelMesh = new OtS_VoxelMesh();
    voxelMesh.addVoxel(1, 2, 3, { r: 1.0, g: 0.5, b: 0.25, a: 0.125 }, 'keep');
    const voxel = voxelMesh.getVoxelAt(1, 2, 3);

    expect(voxel === null).toBe(false);
    expect(voxel?.colour).toStrictEqual({ r: 1.0, g: 0.5, b: 0.25, a: 0.125 });
    expect(voxel?.position.equals(new Vector3(1, 2, 3))).toBe(true);
});

test('VoxelMesh #4', () => {
    const voxelMesh = new OtS_VoxelMesh();
    voxelMesh.addVoxel(1, 2, 3, { r: 1.0, g: 0.5, b: 0.25, a: 0.125 }, 'keep');
    expect(voxelMesh.getVoxelAt(1, 2, 3)?.colour).toStrictEqual({ r: 1.0, g: 0.5, b: 0.25, a: 0.125 });

    voxelMesh.addVoxel(1, 2, 3, { r: 0.0, g: 0.1, b: 0.2, a: 0.3 }, 'keep');
    expect(voxelMesh.getVoxelAt(1, 2, 3)?.colour).toStrictEqual({ r: 1.0, g: 0.5, b: 0.25, a: 0.125 })
});

test('VoxelMesh #5', () => {
    const voxelMesh = new OtS_VoxelMesh();
    voxelMesh.addVoxel(1, 2, 3, { r: 1.0, g: 0.5, b: 0.25, a: 0.125 }, 'replace');
    expect(voxelMesh.getVoxelAt(1, 2, 3)?.colour).toStrictEqual({ r: 1.0, g: 0.5, b: 0.25, a: 0.125 });

    voxelMesh.addVoxel(1, 2, 3, { r: 0.0, g: 0.1, b: 0.2, a: 0.3 }, 'replace');
    expect(voxelMesh.getVoxelAt(1, 2, 3)?.colour).toStrictEqual({ r: 0.0, g: 0.1, b: 0.2, a: 0.3 });
});

test('VoxelMesh #6', () => {
    const voxelMesh = new OtS_VoxelMesh();
    voxelMesh.addVoxel(1, 2, 3, { r: 1.0, g: 0.5, b: 0.125, a: 1.0 }, 'average');
    expect(voxelMesh.getVoxelAt(1, 2, 3)?.colour).toStrictEqual({ r: 1.0, g: 0.5, b: 0.125, a: 1.0 });

    voxelMesh.addVoxel(1, 2, 3, { r: 0.0, g: 0.0, b: 0.0, a: 0.0 }, 'average');
    expect(voxelMesh.getVoxelAt(1, 2, 3)?.colour).toStrictEqual({ r: 0.5, g: 0.25, b: 0.0625, a: 0.5 });
});

test('VoxelMesh #7', () => {
    const voxelMesh = new OtS_VoxelMesh();
    voxelMesh.addVoxel(1, 2, 3, { r: 1.0, g: 1.0, b: 1.0, a: 1.0 }, 'average');
    expect(voxelMesh.getVoxelAt(1, 2, 3)?.colour).toStrictEqual({ r: 1.0, g: 1.0, b: 1.0, a: 1.0 });

    voxelMesh.addVoxel(1, 2, 3, { r: 0.0, g: 0.0, b: 0.0, a: 0.0 }, 'average');
    expect(voxelMesh.getVoxelAt(1, 2, 3)?.colour).toStrictEqual({ r: 0.5, g: 0.5, b: 0.5, a: 0.5 });

    voxelMesh.addVoxel(1, 2, 3, { r: 0.0, g: 0.0, b: 0.0, a: 0.0 }, 'average');
    expect(voxelMesh.getVoxelAt(1, 2, 3)?.colour).toStrictEqual({ r: 1 / 3, g: 1 / 3, b: 1 / 3, a: 1 / 3 });

    voxelMesh.addVoxel(1, 2, 3, { r: 0.0, g: 0.0, b: 0.0, a: 0.0 }, 'average');
    expect(voxelMesh.getVoxelAt(1, 2, 3)?.colour).toStrictEqual({ r: 0.25, g: 0.25, b: 0.25, a: 0.25 });
});

test('VoxelMesh #8', () => {
    const voxelMesh = new OtS_VoxelMesh();
    voxelMesh.addVoxel(1, 2, 3, { r: 1.0, g: 1.0, b: 1.0, a: 1.0 }, 'average');
    expect(voxelMesh.getVoxelCount()).toBe(1);
    expect(voxelMesh.isVoxelAt(1, 2, 3)).toBe(true);

    expect(voxelMesh.removeVoxel(1, 2, 3)).toBe(true);
    expect(voxelMesh.getVoxelCount()).toBe(0);
    expect(voxelMesh.isVoxelAt(1, 2, 3)).toBe(false);

    expect(voxelMesh.removeVoxel(1, 2, 3)).toBe(false);
});