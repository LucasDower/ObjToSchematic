import { RGBA, RGBAColours, RGBAUtil } from '../colour';
import { AppConfig } from '../config';
import { MaterialType, Mesh } from '../mesh';
import { StatusHandler } from '../status';
import { Triangle, UVTriangle } from '../triangle';
import { UV } from '../util';
import { ASSERT } from '../util/error_util';
import { Vector3 } from '../vector';
import { VoxelMesh } from '../voxel_mesh';
import { VoxeliseParams } from '../worker_types';

export abstract class IVoxeliser {
    public voxelise(mesh: Mesh, voxeliseParams: VoxeliseParams.Input): VoxelMesh {
        const voxelMesh = this._voxelise(mesh, voxeliseParams);

        StatusHandler.Get.add('info', `Voxel mesh has ${voxelMesh.getVoxelCount().toLocaleString()} voxels`);

        const dim = voxelMesh.getBounds().getDimensions().add(1);
        StatusHandler.Get.add('info', `Dimensions are ${dim.x.toLocaleString()}x${dim.y.toLocaleString()}x${dim.z.toLocaleString()} voxels`);

        return voxelMesh;
    }

    protected abstract _voxelise(mesh: Mesh, voxeliseParams: VoxeliseParams.Input): VoxelMesh;

    /**
     * `Location` should be in block-space.
     */
    protected _getVoxelColour(mesh: Mesh, triangle: UVTriangle, materialName: string, location: Vector3, multisample: boolean): RGBA {
        const material = mesh.getMaterialByName(materialName);
        ASSERT(material !== undefined);

        if (material.type === MaterialType.solid) {
            return RGBAUtil.copy(material.colour);
        }

        const samples: RGBA[] = [];
        for (let i = 0; i < (multisample ? AppConfig.Get.MULTISAMPLE_COUNT : 1); ++i) {
            const offset = Vector3.random().sub(0.5);
            samples.push(this._internalGetVoxelColour(
                mesh,
                triangle,
                materialName,
                offset.add(location),
            ));
        }

        return RGBAUtil.average(...samples);
    }

    private _internalGetVoxelColour(mesh: Mesh, triangle: UVTriangle, materialName: string, location: Vector3) {
        const material = mesh.getMaterialByName(materialName);
        ASSERT(material !== undefined && material.type === MaterialType.textured);

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
            RGBAUtil.copy(RGBAColours.MAGENTA);
        }

        return mesh.sampleTextureMaterial(materialName, uv);
    }
}
