import { Vector3 } from './vector';
import { UV, Bounds, LOG, ASSERT, CustomError, LOG_WARN } from './util';
import { Triangle, UVTriangle } from './triangle';
import { RGB } from './util';
import { AppContext } from './app_context';

import path from 'path';
import fs from 'fs';

export interface Tri {
    iX: number;
    iY: number;
    iZ: number;
    iXUV: number;
    iYUV: number;
    iZUV: number;
    material: string;
}

/* eslint-disable */
export enum MaterialType { solid, textured }
/* eslint-enable */
export interface SolidMaterial { colour: RGB; type: MaterialType.solid }
export interface TexturedMaterial { path: string; type: MaterialType.textured }
export type MaterialMap = {[key: string]: (SolidMaterial | TexturedMaterial)};

export class Mesh {
    public vertices!: Vector3[];
    public uvs!: UV[];
    public tris!: Tri[];
    public materials!: MaterialMap;

    public static desiredHeight = 8.0;

    constructor(vertices: Vector3[], uvs: UV[], tris: Tri[], materials: MaterialMap) {
        LOG('New mesh');

        this.vertices = vertices;
        this.uvs = uvs;
        this.tris = tris;
        this.materials = materials;

        this._checkMesh();
        this._checkMaterials();

        this._centreMesh();
        this._scaleMesh();

        LOG('Loaded mesh', this);
    }

    public getBounds() {
        const bounds = Bounds.getInfiniteBounds();
        for (const vertex of this.vertices) {
            bounds.extendByPoint(vertex);
        }
        return bounds;
    }

    private _checkMesh() {
        // Check UVs are inside [0, 1]
        for (const uv of this.uvs) {
            if (uv.u < 0.0 || uv.u > 1.0) {
                uv.u = Math.abs(uv.u % 1);
            }
            if (uv.v < 0.0 || uv.v > 1.0) {
                uv.v = Math.abs(uv.v % 1);
            }
        }
    }

    private _checkMaterials() {
        // Check used materials exist
        let wasRemapped = false;
        let debugName = (Math.random() + 1).toString(36).substring(7);
        while (debugName in this.materials) {
            debugName = (Math.random() + 1).toString(36).substring(7);
        }

        for (const tri of this.tris) {
            if (!(tri.material in this.materials)) {
                wasRemapped = true;
                tri.material = debugName;
            }
        }
        if (wasRemapped) {
            AppContext.Get.addWarning('Some materials were not loaded correctly');
            this.materials[debugName] = {
                type: MaterialType.solid,
                colour: RGB.white,
            };
        }
        
        // Check texture paths are absolute and exist
        for (const materialName in this.materials) {
            const material = this.materials[materialName];
            if (material.type === MaterialType.textured) {
                ASSERT(path.isAbsolute(material.path), 'Material texture path not absolute');
                if (!fs.existsSync(material.path)) {
                    AppContext.Get.addWarning(`Could not find ${material.path}`);
                    LOG_WARN(`Could not find ${material.path} for material ${materialName}, changing to solid-white material`);
                    this.materials[materialName] = {
                        type: MaterialType.solid,
                        colour: RGB.white,
                    };
                }
            }
        }
    }

    private _centreMesh() {
        const centre = new Vector3(0, 0, 0);
        let totalWeight = 0.0;

        // Find the weighted centre
        this.tris.forEach((tri, triIndex) => {
            const verts = this.getVertices(triIndex);
            const triangle = new Triangle(verts.v0, verts.v1, verts.v2);

            const weight = triangle.getArea();
            totalWeight += weight;
            centre.add(triangle.getCentre().mulScalar(weight));
        });
        centre.divScalar(totalWeight);

        if (!centre.isNumber()) {
            throw new CustomError('Could not find centre of mesh');
        }
        LOG('Centre', centre);

        // Translate each triangle
        this.vertices.forEach((vertex) => {
            vertex.sub(centre);
        });
    }

    private _scaleMesh() {
        const bounds = this.getBounds();
        const size = Vector3.sub(bounds.max, bounds.min);
        const scaleFactor = Mesh.desiredHeight / size.y;

        if (isNaN(scaleFactor) || !isFinite(scaleFactor)) {
            throw new CustomError('<b>Could not scale mesh correctly</b>: Mesh is likely 2D, rotate it so that it has a non-zero height');
        } else {
            this.vertices.forEach((vertex) => {
                vertex.mulScalar(scaleFactor);
            });
        }
    }

    public getVertices(triIndex: number) {
        const tri = this.tris[triIndex];
        return {
            v0: this.vertices[tri.iX],
            v1: this.vertices[tri.iY],
            v2: this.vertices[tri.iZ],
        };
    }

    public getUVs(triIndex: number) {
        const tri = this.tris[triIndex];
        return {
            uv0: this.uvs[tri.iXUV],
            uv1: this.uvs[tri.iYUV],
            uv2: this.uvs[tri.iZUV],
        };
    }

    public getUVTriangle(triIndex: number): UVTriangle {
        const tri = this.tris[triIndex];
        return new UVTriangle(
            this.vertices[tri.iX],
            this.vertices[tri.iY],
            this.vertices[tri.iZ],
            this.uvs[tri.iXUV] || 0.0,
            this.uvs[tri.iYUV] || 0.0,
            this.uvs[tri.iZUV] || 0.0,
        );
    }

    /*
    public simplify(ratio: number) {
        ASSERT(ratio > 0.0 && ratio <= 1.0);
        const cells: Array<number[]> = Array(this.tris.length);
        this.tris.forEach((tris, index) => {
            cells[index] = [tris.iX, tris.iY, tris.iZ];
        });
        const positions: Array<number[]> = Array(this.vertices.length);
        this.vertices.forEach((vertex, index) => {
            positions[index] = vertex.toArray();
        });
        const targetNumTris = positions.length * ratio;
        const simplified = meshSimplify(cells, positions)(targetNumTris);

        const placeHolderMat = this.tris[0].material;
        this.tris = new Array(simplified.cells.length);
        simplified.cells.forEach((cell: number[], index: number) => {
            this.tris[index] = {
                iX: cell[0],
                iY: cell[1],
                iZ: cell[2],
                iXUV: 0.5,
                iYUV: 0.5,
                iZUV: 0.5,
                material: placeHolderMat,
            };
        });

        this.vertices = new Array(simplified.positions.length);
        simplified.positions.forEach((position: number[], index: number) => {
            this.vertices[index] = Vector3.fromArray(position);
        });
    }
    */

    public copy(): Mesh {
        return new Mesh(this.vertices, this.uvs, this.tris, this.materials);
    }

    public getTriangleCount(): number {
        return this.tris.length;
    }
}
