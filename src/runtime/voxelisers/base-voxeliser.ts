import { RGBA, RGBAColours, RGBAUtil } from '../colour';
import { AppConfig } from '../../editor/config';
import { LOC } from '../../editor/localiser';
import { MaterialType, Mesh } from '../mesh';
import { StatusHandler } from '../../editor/status';
import { Triangle, UVTriangle } from '../triangle';
import { UV } from '../util';
import { ASSERT } from '../util/error_util';
import { Vector3 } from '../vector';
import { VoxelMesh } from '../voxel_mesh';
import { VoxeliseParams } from '../../editor/worker/worker_types';

export abstract class IVoxeliser {
    public voxelise(mesh: Mesh, voxeliseParams: VoxeliseParams.Input): VoxelMesh {
        const voxelMesh = this._voxelise(mesh, voxeliseParams);

        StatusHandler.info(LOC('voxelise.voxel_count', { count: voxelMesh.getVoxelCount() }));

        const dim = voxelMesh.getBounds().getDimensions().add(1);
        StatusHandler.info(LOC('voxelise.voxel_mesh_dimensions', { x: dim.x, y: dim.y, z: dim.z }));

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
