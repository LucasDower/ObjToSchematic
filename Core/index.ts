import { ImporterFactory } from './src/importers/importers';
import { OtS_Texture } from './src/ots_texture';
import { OtS_VoxelMesh } from './src/ots_voxel_mesh';
import { OtS_VoxelMesh_Converter } from './src/ots_voxel_mesh_converter';

export default {
    getImporter: ImporterFactory.GetImporter,
    texture: OtS_Texture,

    voxelMeshConverter: OtS_VoxelMesh_Converter,
    voxelMesh: OtS_VoxelMesh,
};