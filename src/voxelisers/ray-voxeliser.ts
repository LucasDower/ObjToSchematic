import { Bounds } from '../bounds';
import { Mesh } from '../mesh';
import { ProgressManager } from '../progress';
import { Axes, Ray, rayIntersectTriangle } from '../ray';
import { UVTriangle } from '../triangle';
import { ASSERT } from '../util/error_util';
import { Vector3 } from '../vector';
import { VoxelMesh } from '../voxel_mesh';
import { VoxeliseParams } from '../worker_types';
import { IVoxeliser } from './base-voxeliser';

/**
 * This voxeliser works by projecting rays onto each triangle
 * on each of the principle angles and testing for intersections
 */
export class RayVoxeliser extends IVoxeliser {
    private _mesh?: Mesh;
    private _voxelMesh?: VoxelMesh;
    private _voxeliseParams?: VoxeliseParams.Input;

    protected override _voxelise(mesh: Mesh, voxeliseParams: VoxeliseParams.Input): VoxelMesh {
        this._mesh = mesh;
        this._voxelMesh = new VoxelMesh(voxeliseParams);
        this._voxeliseParams = voxeliseParams;

        const meshDimensions = mesh.getBounds().getDimensions();
        let scale: number;
        let offset = new Vector3(0.0, 0.0, 0.0);
        switch (voxeliseParams.constraintAxis) {
            case 'x':
                scale = (voxeliseParams.size - 1) / meshDimensions.x;
                offset = (voxeliseParams.size % 2 === 0) ? new Vector3(0.5, 0.0, 0.0) : new Vector3(0.0, 0.0, 0.0);
                break;
            case 'y':
                scale = (voxeliseParams.size - 1) / meshDimensions.y;
                offset = (voxeliseParams.size % 2 === 0) ? new Vector3(0.0, 0.5, 0.0) : new Vector3(0.0, 0.0, 0.0);
                break;
            case 'z':
                scale = (voxeliseParams.size - 1) / meshDimensions.z;
                offset = (voxeliseParams.size % 2 === 0) ? new Vector3(0.0, 0.0, 0.5) : new Vector3(0.0, 0.0, 0.0);
                break;
        }

        mesh.setTransform((vertex: Vector3) => {
            return vertex.copy().mulScalar(scale).add(offset);
        });

        const numTris = mesh.getTriangleCount();

        const taskHandle = ProgressManager.Get.start('Voxelising');
        for (let triIndex = 0; triIndex < numTris; ++triIndex) {
            ProgressManager.Get.progress(taskHandle, triIndex / numTris);
            const uvTriangle = mesh.getUVTriangle(triIndex);
            const material = mesh.getMaterialByTriangle(triIndex);
            this._voxeliseTri(uvTriangle, material);
        }
        ProgressManager.Get.end(taskHandle);

        mesh.clearTransform();

        return this._voxelMesh;
    }

    private _voxeliseTri(triangle: UVTriangle, materialName: string) {
        const rayList = this._generateRays(triangle.v0, triangle.v1, triangle.v2);

        ASSERT(this._mesh !== undefined);
        ASSERT(this._voxeliseParams !== undefined);
        ASSERT(this._voxelMesh !== undefined);

        for (const ray of rayList) {
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

                const voxelColour = this._getVoxelColour(
                    this._mesh,
                    triangle,
                    materialName,
                    voxelPosition,
                    this._voxeliseParams.useMultisampleColouring,
                );

                this._voxelMesh.addVoxel(voxelPosition, voxelColour);
            }
        };
    }

    private _generateRays(v0: Vector3, v1: Vector3, v2: Vector3): Array<Ray> {
        const bounds: Bounds = new Bounds(
            new Vector3(
                Math.floor(Math.min(v0.x, v1.x, v2.x)),
                Math.floor(Math.min(v0.y, v1.y, v2.y)),
                Math.floor(Math.min(v0.z, v1.z, v2.z)),
            ),
            new Vector3(
                Math.ceil(Math.max(v0.x, v1.x, v2.x)),
                Math.ceil(Math.max(v0.y, v1.y, v2.y)),
                Math.ceil(Math.max(v0.z, v1.z, v2.z)),
            ),
        );

        const rayList: Array<Ray> = [];
        this._traverseX(rayList, bounds);
        this._traverseY(rayList, bounds);
        this._traverseZ(rayList, bounds);
        return rayList;
    }

    private _traverseX(rayList: Array<Ray>, bounds: Bounds) {
        for (let y = bounds.min.y; y <= bounds.max.y; ++y) {
            for (let z = bounds.min.z; z <= bounds.max.z; ++z) {
                rayList.push({
                    origin: new Vector3(bounds.min.x - 1, y, z),
                    axis: Axes.x,
                });
            }
        }
    }

    private _traverseY(rayList: Array<Ray>, bounds: Bounds) {
        for (let x = bounds.min.x; x <= bounds.max.x; ++x) {
            for (let z = bounds.min.z; z <= bounds.max.z; ++z) {
                rayList.push({
                    origin: new Vector3(x, bounds.min.y - 1, z),
                    axis: Axes.y,
                });
            }
        }
    }

    private _traverseZ(rayList: Array<Ray>, bounds: Bounds) {
        for (let x = bounds.min.x; x <= bounds.max.x; ++x) {
            for (let y = bounds.min.y; y <= bounds.max.y; ++y) {
                rayList.push({
                    origin: new Vector3(x, y, bounds.min.z - 1),
                    axis: Axes.z,
                });
            }
        }
    }
}
