import { VoxelMeshParams, VoxelMesh } from '../voxel_mesh';
import { AppConfig } from '../config';
import { Mesh } from '../mesh';
import { Axes, Ray, rayIntersectTriangle } from '../ray';
import { Triangle, UVTriangle } from '../triangle';
import { Bounds, RGB, UV } from '../util';
import { Vector3 } from '../vector';
import { IVoxeliser } from './base-voxeliser';
import { DebugGeometryTemplates } from '../geometry';

/**
 * This voxeliser works by projecting rays onto each triangle
 * on each of the principle angles and testing for intersections
 */
export class NormalCorrectedRayVoxeliser extends IVoxeliser {
    private _mesh?: Mesh;
    private _voxelMesh?: VoxelMesh;
    private _voxelMeshParams?: VoxelMeshParams;
    private _scale!: number;
    private _size!: Vector3;
    private _offset!: Vector3;

    public override voxelise(mesh: Mesh, voxelMeshParams: VoxelMeshParams): VoxelMesh {
        this._mesh = mesh;
        this._voxelMesh = new VoxelMesh(mesh, voxelMeshParams);
        this._voxelMeshParams = voxelMeshParams;

        this._scale = (voxelMeshParams.desiredHeight) / Mesh.desiredHeight;
        const useMesh = mesh.copy(); // TODO: Voxelise without copying mesh, too expensive for dense meshes

        useMesh.scaleMesh(this._scale);
        const bounds = useMesh.getBounds();
        this._size = Vector3.sub(bounds.max, bounds.min);
        this._offset =new Vector3(
            this._size.x % 2 < 0.001 ? 0.5 : 0.0,
            this._size.y % 2 < 0.001 ? 0.5 : 0.0,
            this._size.z % 2 < 0.001 ? 0.5 : 0.0,
        );

        for (let triIndex = 0; triIndex < useMesh.getTriangleCount(); ++triIndex) {
            const uvTriangle = useMesh.getUVTriangle(triIndex);
            const normals = useMesh.getNormals(triIndex);
            const material = useMesh.getMaterialByTriangle(triIndex);
            this._voxeliseTri(uvTriangle, material, normals);
        }

        return this._voxelMesh;
    }

    private _voxeliseTri(triangle: UVTriangle, materialName: string, normals: { v0: Vector3, v1: Vector3, v2: Vector3}) {
        const rayList = this._generateRays(triangle.v0, triangle.v1, triangle.v2,
            this._offset,
        );
        
        rayList.forEach((ray) => {
            const intersection = rayIntersectTriangle(ray, triangle.v0, triangle.v1, triangle.v2);
            if (intersection) {
                const intersectionWorld = Vector3.divScalar(intersection, this._scale);
                this._voxelMesh!.debugBuffer.add(DebugGeometryTemplates.cross(
                    intersectionWorld,
                    0.1,
                    RGB.magenta,
                ));
                
                // Move transition away from normal
                const norm = normals.v0.normalise();
                intersection.sub(Vector3.mulScalar(norm, 0.5));
                // Correct size parity
                intersection.add(this._offset);
                
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
                voxelPosition.round();

                this._voxelMesh!.debugBuffer.add(DebugGeometryTemplates.arrow(
                    intersectionWorld,
                    Vector3.divScalar(voxelPosition, this._scale),
                    RGB.magenta,
                ));

                let voxelColour: RGB;
                if (this._voxelMeshParams!.useMultisampleColouring) {
                    const samples: RGB[] = [];
                    for (let i = 0; i < AppConfig.MULTISAMPLE_COUNT; ++i) {
                        const samplePosition = Vector3.add(voxelPosition, Vector3.random().addScalar(-0.5));
                        samples.push(this.__getVoxelColour(triangle, materialName, samplePosition));
                    }
                    voxelColour = RGB.averageFrom(samples);
                } else {
                    voxelColour = this.__getVoxelColour(triangle, materialName, voxelPosition);
                }

                this._voxelMesh!.addVoxel(voxelPosition, voxelColour);
            }
        });
    }

    // TODO: Remove
    private __getVoxelColour(triangle: UVTriangle, materialName: string, location: Vector3): RGB {
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

    private _generateRays(v0: Vector3, v1: Vector3, v2: Vector3, offset: Vector3): Array<Ray> {
        const bounds: Bounds = new Bounds(
            new Vector3(
                Math.ceil(Math.min(v0.x, v1.x, v2.x)),
                Math.ceil(Math.min(v0.y, v1.y, v2.y)),
                Math.ceil(Math.min(v0.z, v1.z, v2.z)),
            ),
            new Vector3(
                Math.floor(Math.max(v0.x, v1.x, v2.x)),
                Math.floor(Math.max(v0.y, v1.y, v2.y)),
                Math.floor(Math.max(v0.z, v1.z, v2.z)),
            ),
        );
    
        const rayList: Array<Ray> = [];
        this._traverseX(rayList, bounds, offset);
        this._traverseY(rayList, bounds, offset);
        this._traverseZ(rayList, bounds, offset);
        return rayList;
    }
    
    private _traverseX(rayList: Array<Ray>, bounds: Bounds, offset: Vector3) {
        for (let y = bounds.min.y - offset.y; y <= bounds.max.y + offset.y; ++y) {
            for (let z = bounds.min.z - offset.z; z <= bounds.max.z + offset.z; ++z) {
                rayList.push({
                    origin: new Vector3(bounds.min.x - 1, y, z),
                    axis: Axes.x,
                });
            }
        }
    }
    
    private _traverseY(rayList: Array<Ray>, bounds: Bounds, offset: Vector3) {
        for (let x = bounds.min.x - offset.x; x <= bounds.max.x + offset.x; ++x) {
            for (let z = bounds.min.z - offset.z; z <= bounds.max.z + offset.z; ++z) {
                rayList.push({
                    origin: new Vector3(x, bounds.min.y - 1, z),
                    axis: Axes.y,
                });
            }
        }
    }
    
    private _traverseZ(rayList: Array<Ray>, bounds: Bounds, offset: Vector3) {
        for (let x = bounds.min.x - offset.x; x <= bounds.max.x + offset.x; ++x) {
            for (let y = bounds.min.y - offset.y; y <= bounds.max.y + offset.y; ++y) {
                rayList.push({
                    origin: new Vector3(x, y, bounds.min.z - 1),
                    axis: Axes.z,
                });
            }
        }
    }
}
