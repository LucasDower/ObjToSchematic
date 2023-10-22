import { OtS_ReplaceMode, OtS_VoxelMesh } from './ots_voxel_mesh';
import { TAxis } from './util/type_util';
import { Vector3 } from './vector';
import { Triangle } from './triangle';
import { Axes, Ray, rayIntersectTriangle } from './ray';
import { OtS_Colours, RGBA, RGBAUtil } from './colour';
import { OtS_Mesh, OtS_Triangle } from './ots_mesh';
import { UV } from './util';

export type OtS_VoxelMesh_ConverterConfig = {
    constraintAxis: TAxis,
    size: number,
    multisampling: boolean,
    replaceMode: OtS_ReplaceMode,
}

export class OtS_VoxelMesh_Converter {
    private _config: OtS_VoxelMesh_ConverterConfig;

    public constructor() {
        this._config = {
            constraintAxis: 'y',
            size: 80,
            multisampling: true,
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

        const ray: Ray = { axis: Axes.x, origin: new Vector3(0, 0, 0) };

        ray.origin.x = bounds.min.x - 1;
        ray.axis = Axes.x;
        for (let y = bounds.min.y; y <= bounds.max.y; ++y) {
            ray.origin.y = y;
            for (let z = bounds.min.z; z <= bounds.max.z; ++z) {
                ray.origin.z = z;
                this._handleRay(ray, triangle, voxelMesh);
            }
        }

        ray.origin.y = bounds.min.y - 1;
        ray.axis = Axes.y;
        for (let z = bounds.min.z; z <= bounds.max.z; ++z) {
            ray.origin.z = z;
            for (let x = bounds.min.x; x <= bounds.max.x; ++x) {
            ray.origin.x = x;
                this._handleRay(ray, triangle, voxelMesh);
            }
        }

        ray.origin.z = bounds.min.z - 1;
        ray.axis = Axes.z;
        for (let x = bounds.min.x; x <= bounds.max.x; ++x) {
            ray.origin.x = x;
            for (let y = bounds.min.y; y <= bounds.max.y; ++y) {
                ray.origin.y = y;
                this._handleRay(ray, triangle, voxelMesh);
            }
        }
    }

    private _handleRay(ray: Ray, triangle: OtS_Triangle, voxelMesh: OtS_VoxelMesh) {
        const intersection = rayIntersectTriangle(ray, triangle.data.v0.position, triangle.data.v1.position, triangle.data.v2.position);
        
        if (intersection) {
            const voxelPosition = new Vector3(
                intersection.x,
                intersection.y,
                intersection.z,
            ).round();

            let voxelColour: RGBA;
            if (this._config.multisampling) {
                const samples: RGBA[] = [];
                for (let i = 0; i < 8; ++i) {
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