import { OtS_ReplaceMode, OtS_VoxelMesh } from './ots_voxel_mesh';
import { TAxis } from './util/type_util';
import { Material, MaterialType, Mesh, TexturedMaterial, Tri } from './mesh';
import { Vector3 } from './vector';
import { Triangle, UVTriangle } from './triangle';
import { LinearAllocator } from './linear_allocator';
import { Axes, Ray, rayIntersectTriangle } from './ray';
import { Bounds } from './bounds';
import { RGBA, RGBAColours, RGBAUtil } from './colour';
import { UV } from './util';

export type OtS_VoxelMesh_ConverterConfig = {
    constraintAxis: TAxis,
    size: number,
    multisampling: boolean,
    replaceMode: OtS_ReplaceMode,
}

export class OtS_VoxelMesh_Converter {
    private _config: OtS_VoxelMesh_ConverterConfig;
    private _rays: LinearAllocator<Ray>;

    // Reused Bounds object in calculations to avoid GC
    private _tmpBounds: Bounds;

    public constructor() {
        this._config = {
            constraintAxis: 'y',
            size: 80,
            multisampling: true,
            replaceMode: 'average',
        };

        this._rays = new LinearAllocator<Ray>(() => {
            const ray: Ray = { origin: new Vector3(0, 0, 0), axis: Axes.x };
            return ray;
        });

        this._tmpBounds = Bounds.getEmptyBounds();
    }

    /**
     * Attempts to set the config.
     * Returns false if the supplied config is invalid.
     */
    public setConfig(config: OtS_VoxelMesh_ConverterConfig): boolean {
        if (config.size <= 0) {
            return false;
        }

        this._config = config;
        return true;
    }

    public process(mesh: Mesh): OtS_VoxelMesh {
        const voxelMesh = new OtS_VoxelMesh();

        const numTris = mesh.getTriangleCount();
        const { scale, offset } = this._calcScaleOffset(mesh);

        const vertexTransform = (vertex: Vector3) => {
            return vertex.copy().mulScalar(scale).add(offset);
        }

        mesh.setTransform(vertexTransform);
        {
            for (let triIndex = 0; triIndex < numTris; ++triIndex) {
                const uvTriangle = mesh.getUVTriangle(triIndex);
                const material = mesh.getMaterialInfoByTriangle(triIndex);

                this._voxeliseTri(mesh, voxelMesh, uvTriangle, material);
            }
        }
        mesh.clearTransform();

        return voxelMesh;
    }

    private _voxeliseTri(mesh: Mesh, voxelMesh: OtS_VoxelMesh, triangle: UVTriangle, material: Material) {
        this._rays.reset();
        this._generateRays(triangle.v0, triangle.v1, triangle.v2);

        const voxelPosition = new Vector3(0, 0, 0);
        const size = this._rays.size();
        for (let i = 0; i < size; ++i) {
            const ray = this._rays.get(i)!;

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
                    mesh,
                    triangle,
                    material,
                    voxelPosition,
                );

                voxelMesh.addVoxel(voxelPosition.x, voxelPosition.y, voxelPosition.z, voxelColour, this._config.replaceMode);
            }
        };
    }

    private _getVoxelColour(mesh: Mesh, triangle: UVTriangle, material: Material, location: Vector3): RGBA {
        if (material.type === MaterialType.solid) {
            return RGBAUtil.copy(material.colour);
        }

        const samples: RGBA[] = [];
        for (let i = 0; i < (this._config.multisampling ? 8 : 1); ++i) {
            const offset = Vector3.random().sub(0.5);
            samples.push(this._internalGetVoxelColour(
                mesh,
                triangle,
                material,
                offset.add(location),
            ));
        }

        return RGBAUtil.average(...samples);
    }

    private _internalGetVoxelColour(mesh: Mesh, triangle: UVTriangle, material: TexturedMaterial, location: Vector3) {
        const area01 = Triangle.GetArea(triangle.v0, triangle.v1, location);
        const area12 = Triangle.GetArea(triangle.v1, triangle.v2, location);
        const area20 = Triangle.GetArea(triangle.v2, triangle.v0, location);
        const total = area01 + area12 + area20;

        const w0 = area12 / total;
        const w1 = area20 / total;
        const w2 = area01 / total;

        const uv = {
            u: triangle.uv0.u * w0 + triangle.uv1.u * w1 + triangle.uv2.u * w2,
            v: triangle.uv0.v * w0 + triangle.uv1.v * w1 + triangle.uv2.v * w2,
        };

        if (isNaN(uv.u) || isNaN(uv.v)) {
            RGBAUtil.copy(RGBAColours.MAGENTA);
        }

        const texture = mesh.getTexture(material);
        return texture.getRGBA(uv, material.interpolation, material.extension);
    }

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
                const ray = this._rays.place();
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
                const ray = this._rays.place();
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
                const ray = this._rays.place();
                ray.origin.x = x;
                ray.origin.y = y;
                ray.origin.z = bounds.min.z - 1;
                ray.axis = Axes.z;
            }
        }
    }

    private _calcScaleOffset(mesh: Mesh) {
        const dimensions = mesh.getBounds().getDimensions();

        switch (this._config.constraintAxis) {
            case 'x':
                return {
                    scale: (this._config.size - 1) / dimensions.x,
                    offset: (this._config.size % 2 === 0) ? new Vector3(0.5, 0.0, 0.0) : new Vector3(0.0, 0.0, 0.0),
                }
            case 'y':
                return {
                    scale: (this._config.size - 1) / dimensions.y,
                    offset: (this._config.size % 2 === 0) ? new Vector3(0.0, 0.5, 0.0) : new Vector3(0.0, 0.0, 0.0),
                }
            case 'z':
                return {
                    scale: (this._config.size - 1) / dimensions.z,
                    offset: (this._config.size % 2 === 0) ? new Vector3(0.0, 0.0, 0.5) : new Vector3(0.0, 0.0, 0.0),
                }
        }
    }

}