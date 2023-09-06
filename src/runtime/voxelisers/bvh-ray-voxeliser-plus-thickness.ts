import { Mesh } from '../mesh';
import { ProgressManager } from '../../editor/progress';
import { Axes, axesToDirection, Ray } from '../ray';
import { ASSERT } from '../util/error_util';
import { LOG } from '../util/log_util';
import { Vector3 } from '../vector';
import { VoxelMesh } from '../voxel_mesh';
import { VoxeliseParams } from '../../editor/worker/worker_types';
import { IVoxeliser } from './base-voxeliser';

const bvhtree = require('bvh-tree');

/**
 * This voxeliser works by projecting rays onto each triangle
 * on each of the principle angles and testing for intersections
 */
export class BVHRayVoxeliserPlusThickness extends IVoxeliser {
    protected override _voxelise(mesh: Mesh, voxeliseParams: VoxeliseParams.Input): VoxelMesh {
        const voxelMesh = new VoxelMesh(voxeliseParams);

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

        // Build BVH
        const triangles = Array<{ x: Number, y: Number, z: Number }[]>(mesh._tris.length);
        for (let triIndex = 0; triIndex < mesh.getTriangleCount(); ++triIndex) {
            const positionData = mesh.getVertices(triIndex);
            triangles[triIndex] = [positionData.v0, positionData.v1, positionData.v2];
        }

        const MAX_TRIANGLES_PER_NODE = 8;
        LOG('Creating BVH...');
        const bvh = new bvhtree.BVH(triangles, MAX_TRIANGLES_PER_NODE);
        LOG('BVH created...');

        // Generate rays
        const bounds = mesh.getBounds();
        bounds.min.floor();
        bounds.max.ceil();

        const planeDims = Vector3.sub(bounds.max, bounds.min).add(1);
        const numRays = (planeDims.x * planeDims.y) + (planeDims.x * planeDims.z) + (planeDims.y * planeDims.z);
        const rays = new Array<Ray>(numRays);
        let rayIndex = 0;
        {
            // Generate x-plane rays
            for (let y = bounds.min.y; y <= bounds.max.y; ++y) {
                for (let z = bounds.min.z; z <= bounds.max.z; ++z) {
                    rays[rayIndex++] = {
                        origin: new Vector3(bounds.min.x - 1, y, z),
                        axis: Axes.x,
                    };
                }
            }
            // Generate y-plane rays
            for (let x = bounds.min.x; x <= bounds.max.x; ++x) {
                for (let z = bounds.min.z; z <= bounds.max.z; ++z) {
                    rays[rayIndex++] = {
                        origin: new Vector3(x, bounds.min.y - 1, z),
                        axis: Axes.y,
                    };
                }
            }
            // Generate z-plane rays
            for (let x = bounds.min.x; x <= bounds.max.x; ++x) {
                for (let y = bounds.min.y; y <= bounds.max.y; ++y) {
                    rays[rayIndex++] = {
                        origin: new Vector3(x, y, bounds.min.z - 1),
                        axis: Axes.z,
                    };
                }
            }
        }
        ASSERT(rays.length === rayIndex);
        LOG('Rays created...');

        // Ray test BVH
        const taskHandle = ProgressManager.Get.start('Voxelising');
        for (rayIndex = 0; rayIndex < rays.length; ++rayIndex) {
            ProgressManager.Get.progress(taskHandle, rayIndex / rays.length);

            const ray = rays[rayIndex];
            const intersections = bvh.intersectRay(ray.origin, axesToDirection(ray.axis), false);
            for (const intersection of intersections) {
                const point = intersection.intersectionPoint;
                const position = new Vector3(point.x, point.y, point.z);

                // Shrinking towards the perpendicular vector
                const triangle = mesh.getUVTriangle(intersection.triangleIndex);
                const v0 = Vector3.sub(triangle.v1, triangle.v0);
                const v1 = Vector3.sub(triangle.v2, triangle.v0);
                const crossVec = Vector3.cross(v1, v0);
                const depthPosition = position.copy().add(crossVec.normalise().mulScalar(0.5)).round();

                const voxelColour = this._getVoxelColour(
                    mesh,
                    mesh.getUVTriangle(intersection.triangleIndex),
                    mesh.getMaterialByTriangle(intersection.triangleIndex),
                    position,
                    voxeliseParams.useMultisampleColouring,
                );

                voxelMesh.addVoxel(position, voxelColour);
                if (!depthPosition.equals(position)) {
                    voxelMesh.addVoxel(depthPosition, voxelColour);
                }
            }
        }
        ProgressManager.Get.end(taskHandle);

        mesh.clearTransform();

        return voxelMesh;
    }
}
