import { RGBA, RGBAColours, RGBAUtil } from '../colour';
import { MaterialType, Mesh } from '../mesh';
import { Triangle, UVTriangle } from '../triangle';
import { UV } from '../util';
import { ASSERT } from '../util/error_util';
import { Vector3 } from '../vector';
import { TAxis } from '../util/type_util';
import { OtS_ReplaceMode, OtS_VoxelMesh } from '../ots_voxel_mesh';

export abstract class IVoxeliser {
    private _multisampleCount: number = 16;

    public voxelise(mesh: Mesh, replaceMode: OtS_ReplaceMode, constraintAxis: TAxis, size: number, multisampling: boolean, onProgress?: (percentage: number) => void): OtS_VoxelMesh {
        return this._voxelise(mesh, replaceMode, constraintAxis, size, multisampling, onProgress);
    }

    protected abstract _voxelise(mesh: Mesh, replaceMode: OtS_ReplaceMode, constraintAxis: TAxis, size: number, multisampling: boolean, onProgress?: (percentage: number) => void): OtS_VoxelMesh;

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
        for (let i = 0; i < (multisample ? this._multisampleCount : 1); ++i) {
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


    public setMultisampleCount(count: number) {
        this._multisampleCount = count;
    }
}
