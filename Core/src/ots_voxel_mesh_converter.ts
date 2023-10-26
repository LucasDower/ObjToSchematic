import { OtS_ReplaceMode, OtS_VoxelMesh } from './ots_voxel_mesh';
import { TAxis } from './util/type_util';
import { Vector3 } from './vector';
import { Triangle } from './triangle';
import { OtS_Colours, RGBA, RGBAUtil } from './colour';
import { OtS_Mesh, OtS_Triangle } from './ots_mesh';
import { UV } from './util';
import { rayIntersectTriangleFastX, rayIntersectTriangleFastY, rayIntersectTriangleFastZ, RayIntersect } from './ray';
import { findFirstTrueIndex } from './util/array_util';

export type OtS_VoxelMesh_ConverterConfig = {
    constraintAxis: TAxis,
    size: number,
    multisampling?: number,
    replaceMode: OtS_ReplaceMode,
}

export class OtS_VoxelMesh_Converter {
    private _config: OtS_VoxelMesh_ConverterConfig;

    public constructor() {
        this._config = {
            constraintAxis: 'y',
            size: 80,
            multisampling: 8,
            replaceMode: 'average',
        };
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

    public process(mesh: OtS_Mesh): OtS_VoxelMesh {
        const voxelMesh = new OtS_VoxelMesh();

        const { scale, offset } = this._calcScaleOffset(mesh);

        const normalisedMesh = mesh.copy();
        normalisedMesh.scale(scale);
        normalisedMesh.translate(offset.x, offset.y, offset.z);

        for (const triangle of normalisedMesh.getTriangles()) {
            this._handleTriangle(triangle, voxelMesh);
        }

        return voxelMesh;
    }

    private _handleTriangle(triangle: OtS_Triangle, voxelMesh: OtS_VoxelMesh) {
        const bounds = Triangle.CalcBounds(triangle.data.v0.position, triangle.data.v1.position, triangle.data.v2.position);
        bounds.min.floor();
        bounds.max.ceil();

        const rayOrigin = new Vector3(0, 0, 0);

        const edge1 = Vector3.sub(triangle.data.v1.position, triangle.data.v0.position);
        const edge2 = Vector3.sub(triangle.data.v2.position, triangle.data.v0.position);

        const rasterisePlane = (a0: 'x' | 'y' | 'z', a1: 'x' | 'y' | 'z', a2: 'x' | 'y' | 'z', intersect: RayIntersect) => {
            rayOrigin[a0] = bounds.min[a0] - 1;
            for (let y = bounds.min[a1]; y <= bounds.max[a1]; ++y) {
                rayOrigin[a1] = y;
                let hasHit = false;

                const start = findFirstTrueIndex(bounds.max[a2] - bounds.min[a2] + 1, (index: number) => {
                    rayOrigin[a2] = bounds.min[a2] + index;
                    return intersect(rayOrigin, triangle, edge1, edge2) !== undefined;
                });

                for (let z = bounds.min[a2] + start; z <= bounds.max[a2]; ++z) {
                    rayOrigin[a2] = z;
                    const intersection = intersect(rayOrigin, triangle, edge1, edge2);
                    if (intersection) {
                        this._handleRayHit(intersection, triangle, voxelMesh);
                    } else if (hasHit) {
                        break;
                    }
                }
            }
        }

        rasterisePlane('x', 'y', 'z', rayIntersectTriangleFastX);
        rasterisePlane('y', 'z', 'x', rayIntersectTriangleFastY);
        rasterisePlane('z', 'x', 'y', rayIntersectTriangleFastZ);
    }

    private _handleRayHit(intersection: Vector3, triangle: OtS_Triangle, voxelMesh: OtS_VoxelMesh) {
        const voxelPosition = new Vector3(
            intersection.x,
            intersection.y,
            intersection.z,
        ).round();

        let voxelColour: RGBA;
        if (this._config.multisampling !== undefined) {
            const samples: RGBA[] = [];
            for (let i = 0; i < this._config.multisampling; ++i) {
                samples.push(this._getVoxelColour(
                    triangle,
                    Vector3.random().divScalar(2.0).add(voxelPosition),
                ))
            }
            voxelColour = RGBAUtil.average(...samples);
        } else {
            voxelColour = this._getVoxelColour(
                triangle,
                voxelPosition,
            );
        }

        voxelMesh.addVoxel(voxelPosition.x, voxelPosition.y, voxelPosition.z, voxelColour, this._config.replaceMode);
    }

    private _getVoxelColour(triangle: OtS_Triangle, location: Vector3): RGBA {
        if (triangle.type === 'solid') {
            return triangle.colour;
        }

        const area01 = Triangle.CalcArea(triangle.data.v0.position, triangle.data.v1.position, location);
        const area12 = Triangle.CalcArea(triangle.data.v1.position, triangle.data.v2.position, location);
        const area20 = Triangle.CalcArea(triangle.data.v2.position, triangle.data.v0.position, location);
        const total = area01 + area12 + area20;

        const w0 = area12 / total;
        const w1 = area20 / total;
        const w2 = area01 / total;

        if (triangle.type === 'coloured') {
            return {
                r: triangle.data.v0.colour.r * w0 + triangle.data.v1.colour.r * w1 * triangle.data.v2.colour.r * w2,
                g: triangle.data.v0.colour.g * w0 + triangle.data.v1.colour.g * w1 * triangle.data.v2.colour.g * w2,
                b: triangle.data.v0.colour.b * w0 + triangle.data.v1.colour.b * w1 * triangle.data.v2.colour.b * w2,
                a: triangle.data.v0.colour.a * w0 + triangle.data.v1.colour.a * w1 * triangle.data.v2.colour.a * w2,
            };
        }

        const texcoord: UV = {
            u: triangle.data.v0.texcoord.u * w0 + triangle.data.v1.texcoord.u * w1 + triangle.data.v2.texcoord.u * w2,
            v: triangle.data.v0.texcoord.v * w0 + triangle.data.v1.texcoord.v * w1 + triangle.data.v2.texcoord.v * w2,
        };

        if (isNaN(texcoord.u) || isNaN(texcoord.v)) {
            return OtS_Colours.MAGENTA;
        }

        return triangle.texture.sample(texcoord.u, texcoord.v);
    }

    private _calcScaleOffset(mesh: OtS_Mesh) {
        const dimensions = mesh.calcBounds().getDimensions();

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