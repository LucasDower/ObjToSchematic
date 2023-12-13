import { OtS_VoxelMesh } from '../src/ots_voxel_mesh';
import { OtS_Colours, RGBAUtil } from '../src/colour';
import { OtS_BlockMesh_Converter } from '../src/ots_block_mesh_converter';

test('Per-block', () => {
    const voxelMesh = OtS_VoxelMesh.Create();
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

test('Per-face', () => {
    const voxelMesh = OtS_VoxelMesh.Create();
    voxelMesh.addVoxel(0, 0, 0, OtS_Colours.RED);
    voxelMesh.addVoxel(0, -1, 0, OtS_Colours.BLUE);
    voxelMesh.addVoxel(1, 0, 0, OtS_Colours.BLUE);
    voxelMesh.addVoxel(-1, 0, 0, OtS_Colours.BLUE);
    voxelMesh.addVoxel(0, 0, 1, OtS_Colours.BLUE);
    voxelMesh.addVoxel(0, 0, -1, OtS_Colours.BLUE);

    const converter = new OtS_BlockMesh_Converter();
    converter.setConfig({
        mode: {
            type: 'per-face', data: {
                blocks: [
                    { 
                        name: 'RED-TOP-BLOCK',
                        textures: {
                            up: 'RED',
                            down: 'BLACK',
                            north: 'BLACK',
                            south: 'BLACK',
                            east: 'BLACK',
                            west: 'BLACK',
                        },
                    },
                    { 
                        name: 'BLUE-BLOCK',
                        textures: {
                            up: 'BLUE',
                            down: 'BLUE',
                            north: 'BLUE',
                            south: 'BLUE',
                            east: 'BLUE',
                            west: 'BLUE',
                        },
                    },
                    { 
                        name: 'KINDA-RED-BLOCK',
                        textures: {
                            up: 'KINDA-RED',
                            down: 'KINDA-RED',
                            north: 'KINDA-RED',
                            south: 'KINDA-RED',
                            east: 'KINDA-RED',
                            west: 'KINDA-RED',
                        },
                    }
                ],
                textures: {
                    'RED': OtS_Colours.RED,
                    'BLACK': OtS_Colours.BLACK,
                    'BLUE': OtS_Colours.BLUE,
                    'KINDA-RED': { r: 0.5, g: 0.0, b: 0.0, a: 1.0 },
                },
            }
        },
    });

    const blockMesh = converter.process(voxelMesh);
    expect(blockMesh.getBlockCount()).toBe(6);
    expect(blockMesh.getBlockAt(0, 0, 0)?.name).toBe('RED-TOP-BLOCK');
});