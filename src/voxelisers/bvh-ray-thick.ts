import { Mesh } from '../mesh';
import { ProgressManager } from '../progress';
import { Axes, axesToDirection, Ray } from '../ray';
import { ASSERT } from '../util/error_util';
import { LOG } from '../util/log_util';
import { Vector3 } from '../vector';
import { VoxelMesh } from '../voxel_mesh';
import { VoxeliseParams } from '../worker_types';
import { IVoxeliser } from './base-voxeliser';

const bvhtree = require('bvh-tree');

function cross(v0: Vector3, v1: Vector3) {
  return new Vector3(v0.y * v1.z - v0.z * v1.y, v0.z * v1.x - v0.x * v1.z, v0.x * v1.y - v0.y * v1.x)
}

/**
 * This voxeliser works by projecting rays onto each triangle
 * on each of the principle angles and testing for intersections
 */
export class BVHRayVoxeliserThick extends IVoxeliser {
    protected override _voxelise(mesh: Mesh, voxeliseParams: VoxeliseParams.Input): VoxelMesh {
        const voxelMesh = new VoxelMesh(voxeliseParams);
        const scale = (voxeliseParams.desiredHeight - 1) / Mesh.desiredHeight;
        const offset = (voxeliseParams.desiredHeight % 2 === 0) ? new Vector3(0.0, 0.5, 0.0) : new Vector3(0.0, 0.0, 0.0);

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

        const VecZero = new Vector3(0, 0, 0)

        // Ray test BVH
        const taskHandle = ProgressManager.Get.start('Voxelising');
        for (rayIndex = 0; rayIndex < rays.length; ++rayIndex) {
            ProgressManager.Get.progress(taskHandle, rayIndex / rays.length);

            const ray = rays[rayIndex];
            const intersections = bvh.intersectRay(ray.origin, axesToDirection(ray.axis), false);
            for (const intersection of intersections) {
                const point = intersection.intersectionPoint;
                const position = new Vector3(point.x, point.y, point.z);
                
                // // Shrinking towards the center
                // const centerVector = VecZero.copy().sub(position)
                // const depthPosition = position.copy().add(centerVector.normalise()).round()
                
                // Shrinking towards the perpendicular vector
                const triangle = intersection.triangle
                const p0 = new Vector3(triangle[0].x, triangle[0].y, triangle[0].z)
                const p1 = new Vector3(triangle[1].x, triangle[1].y, triangle[1].z)
                const p2 = new Vector3(triangle[2].x, triangle[2].y, triangle[2].z)
                const v0 = p1.sub(p0)
                const v1 = p2.sub(p0)
                const crossVec = cross(v1, v0)
                const depthPosition = position.copy().add(crossVec.normalise().mulScalar(0.5)).round()

                // const depthPosition = position.copy().add(scaler.normalise()).round()
                position.round();

                const voxelColour = this._getVoxelColour(
                    mesh,
                    mesh.getUVTriangle(intersection.triangleIndex),
                    mesh.getMaterialByTriangle(intersection.triangleIndex),
                    position,
                    voxeliseParams.textureFiltering,
                );

                if (voxelColour) {
                  voxelMesh.addVoxel(position, voxelColour);
                  // if (crossVec.magnitude() > 0.5) {
                  //   const depthPosition = position.copy().add(crossVec.normalise().mulScalar(0.5)).round()
                  //   voxelMesh.addVoxel(depthPosition, voxelColour)
                  // }
                  if (!depthPosition.equals(position)) {
                    voxelMesh.addVoxel(depthPosition, voxelColour)
                  }
                }
            }
        }
        ProgressManager.Get.end(taskHandle);

        mesh.clearTransform();

        return voxelMesh;
    }
}
