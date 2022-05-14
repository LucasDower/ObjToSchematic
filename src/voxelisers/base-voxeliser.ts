import { UVTriangle, Triangle } from '../triangle';
import { ASSERT, RGB, UV } from '../util';
import { Vector3 } from '../vector';
import { Mesh } from '../mesh';
import { VoxelMesh, VoxelMeshParams} from '../voxel_mesh';
import { TextureFiltering } from '../texture';
import { StatusHandler } from '../status';

export abstract class IVoxeliser {
    public voxelise(mesh: Mesh, voxelMeshParams: VoxelMeshParams): VoxelMesh {
        const voxelMesh = this._voxelise(mesh, voxelMeshParams);

        StatusHandler.Get.add('info', `Voxel mesh has ${voxelMesh.getVoxelCount().toLocaleString()} voxels`);

        const dim = voxelMesh.getBounds().getDimensions().add(1);
        StatusHandler.Get.add('info', `Dimensions are ${dim.x.toLocaleString()}x${dim.y.toLocaleString()}x${dim.z.toLocaleString()} voxels`);

        return voxelMesh;
    }

    protected abstract _voxelise(mesh: Mesh, voxelMeshParams: VoxelMeshParams): VoxelMesh;

    protected _getVoxelColour(mesh: Mesh, triangle: UVTriangle, materialName: string, location: Vector3, filtering: TextureFiltering): (RGB | undefined) {
        const area01 = new Triangle(triangle.v0, triangle.v1, location).getArea();
        const area12 = new Triangle(triangle.v1, triangle.v2, location).getArea();
        const area20 = new Triangle(triangle.v2, triangle.v0, location).getArea();
        const total = area01 + area12 + area20;

        const w0 = area12 / total;
        const w1 = area20 / total;
        const w2 = area01 / total;

        const uv = new UV(
            triangle.uv0.u * w0 + triangle.uv1.u * w1 + triangle.uv2.u * w2,
            triangle.uv0.v * w0 + triangle.uv1.v * w1 + triangle.uv2.v * w2,
        );
        
        if (isNaN(uv.u) || isNaN(uv.v)) {
            return undefined;
        }
        
        return mesh.sampleMaterial(materialName, uv, filtering);
    }
}
