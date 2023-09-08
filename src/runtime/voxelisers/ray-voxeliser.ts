import { Bounds } from '../bounds';
import { LinearAllocator } from '../linear_allocator';
import { Mesh } from '../mesh';
import { OtS_ReplaceMode, OtS_VoxelMesh } from '../ots_voxel_mesh';
import { Axes, Ray, rayIntersectTriangle } from '../ray';
import { UVTriangle } from '../triangle';
import { ASSERT } from '../util/error_util';
import { TAxis } from '../util/type_util';
import { Vector3 } from '../vector';
import { IVoxeliser } from './base-voxeliser';

/**
 * This voxeliser works by projecting rays onto each triangle
 * on each of the principle angles and testing for intersections
 */export class RayVoxeliser extends IVoxeliser {
    private _mesh?: Mesh;
    private _voxelMesh?: OtS_VoxelMesh;

    protected override _voxelise(mesh: Mesh, replaceMode: OtS_ReplaceMode, constraintAxis: TAxis, size: number, multisampling: boolean, onProgress?: (percentage: number) => void): OtS_VoxelMesh {
        this._mesh = mesh;
        this._voxelMesh = new OtS_VoxelMesh();

        const meshDimensions = mesh.getBounds().getDimensions();
        let scale: number;
        let offset = new Vector3(0.0, 0.0, 0.0);
        switch (constraintAxis) {
            case 'x':
                scale = (size - 1) / meshDimensions.x;
                offset = (size % 2 === 0) ? new Vector3(0.5, 0.0, 0.0) : new Vector3(0.0, 0.0, 0.0);
                break;
            case 'y':
                scale = (size - 1) / meshDimensions.y;
                offset = (size % 2 === 0) ? new Vector3(0.0, 0.5, 0.0) : new Vector3(0.0, 0.0, 0.0);
                break;
            case 'z':
                scale = (size - 1) / meshDimensions.z;
                offset = (size % 2 === 0) ? new Vector3(0.0, 0.0, 0.5) : new Vector3(0.0, 0.0, 0.0);
                break;
        }

        mesh.setTransform((vertex: Vector3) => {
            return vertex.copy().mulScalar(scale).add(offset);
        });

        const numTris = mesh.getTriangleCount();

        for (let triIndex = 0; triIndex < numTris; ++triIndex) {
            onProgress?.(triIndex / numTris);
            const uvTriangle = mesh.getUVTriangle(triIndex);
            const material = mesh.getMaterialByTriangle(triIndex);
            this._voxeliseTri(uvTriangle, material, multisampling, replaceMode);
        }

        mesh.clearTransform();

        return this._voxelMesh;
    }

    private _rayList = new LinearAllocator<Ray>(() => {
        const ray: Ray = { origin: new Vector3(0, 0, 0), axis: Axes.x };
        return ray;
    });
    private _voxeliseTri(triangle: UVTriangle, materialName: string, multisampling: boolean, replaceMode: OtS_ReplaceMode) {
        this._rayList.reset();
        this._generateRays(triangle.v0, triangle.v1, triangle.v2);

        ASSERT(this._mesh !== undefined);
        ASSERT(this._voxelMesh !== undefined);

        const voxelPosition = new Vector3(0, 0, 0);
        const size = this._rayList.size();
        for (let i = 0; i < size; ++i) {
            const ray = this._rayList.get(i)!;

            const intersection = rayIntersectTriangle(ray, triangle.v0, triangle.v1, triangle.v2);
            if (intersection) {
                switch (ray.axis) {
                    case Axes.x:
                        voxelPosition.x = Math.round(intersection.x);
                        voxelPosition.y = intersection.y;
                        voxelPosition.z = intersection.z;
                        break;
                    case Axes.y:
                        voxelPosition.x = intersection.x;
                        voxelPosition.y = Math.round(intersection.y);
                        voxelPosition.z = intersection.z;
                        break;
                    case Axes.z:
                        voxelPosition.x = intersection.x;
                        voxelPosition.y = intersection.y;
                        voxelPosition.z = Math.round(intersection.z);
                        break;
                }

                const voxelColour = this._getVoxelColour(
                    this._mesh,
                    triangle,
                    materialName,
                    voxelPosition,
                    multisampling,
                );

                this._voxelMesh.addVoxel(voxelPosition.x, voxelPosition.y, voxelPosition.z, voxelColour, replaceMode);
            }
        };
    }

    private _tmpBounds: Bounds = new Bounds(new Vector3(0, 0, 0), new Vector3(0, 0, 0));
    private _generateRays(v0: Vector3, v1: Vector3, v2: Vector3) {
        this._tmpBounds.min.x = Math.floor(Math.min(v0.x, v1.x, v2.x));
        this._tmpBounds.min.y = Math.floor(Math.min(v0.y, v1.y, v2.y));
        this._tmpBounds.min.z = Math.floor(Math.min(v0.z, v1.z, v2.z));

        this._tmpBounds.max.x = Math.floor(Math.max(v0.x, v1.x, v2.x));
        this._tmpBounds.max.y = Math.floor(Math.max(v0.y, v1.y, v2.y));
        this._tmpBounds.max.z = Math.floor(Math.max(v0.z, v1.z, v2.z));

        //const rayList: Array<Ray> = [];
        this._traverseX(this._tmpBounds);
        this._traverseY(this._tmpBounds);
        this._traverseZ(this._tmpBounds);
        //return rayList;
    }

    private _traverseX(bounds: Bounds) {
        for (let y = bounds.min.y; y <= bounds.max.y; ++y) {
            for (let z = bounds.min.z; z <= bounds.max.z; ++z) {
                const ray = this._rayList.place();
                ray.origin.x = bounds.min.x - 1;
                ray.origin.y = y;
                ray.origin.z = z;
                ray.axis = Axes.x;
            }
        }
    }

    private _traverseY(bounds: Bounds) {
        for (let x = bounds.min.x; x <= bounds.max.x; ++x) {
            for (let z = bounds.min.z; z <= bounds.max.z; ++z) {
                const ray = this._rayList.place();
                ray.origin.x = x;
                ray.origin.y = bounds.min.y - 1;
                ray.origin.z = z;
                ray.axis = Axes.y;
            }
        }
    }

    private _traverseZ(bounds: Bounds) {
        for (let x = bounds.min.x; x <= bounds.max.x; ++x) {
            for (let y = bounds.min.y; y <= bounds.max.y; ++y) {
                const ray = this._rayList.place();
                ray.origin.x = x;
                ray.origin.y = y;
                ray.origin.z = bounds.min.z - 1;
                ray.axis = Axes.z;
            }
        }
    }
}
