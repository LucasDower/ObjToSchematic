import { OtS_VoxelMesh } from '../src/ots_voxel_mesh';
import { OtS_Colours, RGBAUtil } from '../src/colour';
import { OtS_BlockMesh_Converter } from '../src/ots_block_mesh_converter';

test('Per-block', () => {
    const voxelMesh = new OtS_VoxelMesh();
    voxelMesh.addVoxel(0, 0, 0, OtS_Colours.RED);
    voxelMesh.addVoxel(1, 0, 0, OtS_Colours.GREEN);
    voxelMesh.addVoxel(2, 0, 0, OtS_Colours.BLUE);

    const converter = new OtS_BlockMesh_Converter();
    converter.setConfig({
        mode: {
            type: 'per-block', data: [
                { name: 'RED-BLOCK', colour: OtS_Colours.RED },
                { name: 'GREEN-BLOCK', colour: OtS_Colours.GREEN },
                { name: 'BLUE-BLOCK', colour: OtS_Colours.BLUE }
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
