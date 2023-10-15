import { RGBAColours } from '../src/colour';
import { OtS_VoxelMesh } from '../src/ots_voxel_mesh';
import { RGBAUtil } from '../src/colour';
import { OtS_BlockMesh_Converter } from '../src/ots_block_mesh_converter';

test('Per-block', () => {
    const voxelMesh = new OtS_VoxelMesh();
    voxelMesh.addVoxel(0, 0, 0, RGBAUtil.copy(RGBAColours.RED));
    voxelMesh.addVoxel(1, 0, 0, RGBAUtil.copy(RGBAColours.GREEN));
    voxelMesh.addVoxel(2, 0, 0, RGBAUtil.copy(RGBAColours.BLUE));

    const converter = new OtS_BlockMesh_Converter();
    converter.setConfig({
        mode: {
            type: 'per-block', data: [
                { name: 'RED-BLOCK', colour: RGBAUtil.copy(RGBAColours.RED) },
                { name: 'GREEN-BLOCK', colour: RGBAUtil.copy(RGBAColours.GREEN) },
                { name: 'BLUE-BLOCK', colour: RGBAUtil.copy(RGBAColours.BLUE) }
            ]
        },
    });

    const blockMesh = converter.process(voxelMesh);

    expect(blockMesh.isBlockAt(0, 0, 0)).toBe(true);
    expect(blockMesh.getBlockAt(0, 0, 0)?.name).toBe('RED-BLOCK');

    expect(blockMesh.isBlockAt(1, 0, 0)).toBe(true);
    expect(blockMesh.getBlockAt(1, 0, 0)?.name).toBe('GREEN-BLOCK');

    expect(blockMesh.isBlockAt(2, 0, 0)).toBe(true);
    expect(blockMesh.getBlockAt(2, 0, 0)?.name).toBe('BLUE-BLOCK');
});
