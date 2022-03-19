import { VoxelMeshParams, VoxelMesh } from '../voxel_mesh';
import { AppConfig } from '../config';
import { Mesh } from '../mesh';
import { Axes, generateRays, rayIntersectTriangle } from '../ray';
import { Triangle, UVTriangle } from '../triangle';
import { RGB, UV } from '../util';
import { Vector3 } from '../vector';
import { IVoxeliser } from './base-voxeliser';

/**
 * This voxeliser works by projecting rays onto each triangle
 * on each of the principle angles and testing for intersections
 */
export class RayVoxeliser extends IVoxeliser {
    private _mesh?: Mesh;
    private _voxelMesh?: VoxelMesh;
    private _voxelMeshParams?: VoxelMeshParams;

    public override voxelise(mesh: Mesh, voxelMeshParams: VoxelMeshParams): VoxelMesh {
        this._mesh = mesh;
        this._voxelMesh = new VoxelMesh(mesh, voxelMeshParams);
        this._voxelMeshParams = voxelMeshParams;
        
        const scale = (voxelMeshParams.desiredHeight - 1) / Mesh.desiredHeight;
        const offset = (voxelMeshParams.desiredHeight % 2 === 0) ? new Vector3(0.0, 0.5, 0.0) : new Vector3(0.0, 0.0, 0.0);
        const useMesh = mesh.copy();

        useMesh.scaleMesh(scale);
        useMesh.translateMesh(offset);

        for (let triIndex = 0; triIndex < useMesh.getTriangleCount(); ++triIndex) {
            const uvTriangle = useMesh.getUVTriangle(triIndex);
            const material = useMesh.getMaterialByTriangle(triIndex);
            this._voxeliseTri(uvTriangle, material);
        }

        return this._voxelMesh;
    }

    private _voxeliseTri(triangle: UVTriangle, materialName: string) {
        const rayList = generateRays(triangle.v0, triangle.v1, triangle.v2);
        
        rayList.forEach((ray) => {
            const intersection = rayIntersectTriangle(ray, triangle.v0, triangle.v1, triangle.v2);
            if (intersection) {
                let voxelPosition: Vector3;
                switch (ray.axis) {
                case Axes.x:
                    voxelPosition = new Vector3(Math.round(intersection.x), intersection.y, intersection.z);
                    break;
                case Axes.y:
                    voxelPosition = new Vector3(intersection.x, Math.round(intersection.y), intersection.z);
                    break;
                case Axes.z:
                    voxelPosition = new Vector3(intersection.x, intersection.y, Math.round(intersection.z));
                    break;
                }

                let voxelColour: RGB;
                if (this._voxelMeshParams!.useMultisampleColouring) {
                    const samples: RGB[] = [];
                    for (let i = 0; i < AppConfig.MULTISAMPLE_COUNT; ++i) {
                        const samplePosition = Vector3.add(voxelPosition, Vector3.random().addScalar(-0.5));
                        samples.push(this._getVoxelColour(triangle, materialName, samplePosition));
                    }
                    voxelColour = RGB.averageFrom(samples);
                } else {
                    voxelColour = this._getVoxelColour(triangle, materialName, voxelPosition);
                }

                this._voxelMesh!.addVoxel(voxelPosition, voxelColour);
            }
        });
    }

    private _getVoxelColour(triangle: UVTriangle, materialName: string, location: Vector3): RGB {
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
        
        return this._mesh!.sampleMaterial(materialName, uv, this._voxelMeshParams!.textureFiltering);
    }
}
