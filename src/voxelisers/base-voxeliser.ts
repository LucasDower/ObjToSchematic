import { Mesh } from '../mesh';
import { VoxelMesh, VoxelMeshParams} from '../voxel_mesh';

export abstract class IVoxeliser {
    public abstract voxelise(mesh: Mesh, voxelMeshParams: VoxelMeshParams): VoxelMesh;
}
