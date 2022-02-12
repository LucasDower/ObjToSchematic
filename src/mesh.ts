import { Vector3 } from './vector';
import { UV, Bounds, ASSERT, LOG } from './util';
import { Triangle, UVTriangle } from './triangle';
import { RGB } from './util';

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

        this._centreMesh();
        this._scaleMesh();
    }

    public getBounds() {
        const bounds = Bounds.getInfiniteBounds();
        for (const vertex of this.vertices) {
            bounds.extendByPoint(vertex);
        }
        return bounds;
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

        // Translate each triangle
        this.vertices.forEach((vertex) => {
            vertex.sub(centre);
        });
    }

    private _scaleMesh() {
        const bounds = this.getBounds();
        const size = Vector3.sub(bounds.max, bounds.min);
        const scaleFactor = Mesh.desiredHeight / size.y;

        this.vertices.forEach((vertex) => {
            vertex.mulScalar(scaleFactor);
        });
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
            this.uvs[tri.iXUV],
            this.uvs[tri.iYUV],
            this.uvs[tri.iZUV],
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
