import { Vector3 } from './vector';
import { UV, Bounds, LOG, ASSERT, CustomError, LOG_WARN, Warnable, getRandomID } from './util';
import { Triangle, UVTriangle } from './triangle';
import { RGB } from './util';

import path from 'path';
import fs from 'fs';
import { Texture, TextureFiltering } from './texture';

interface VertexIndices {
    x: number;
    y: number;
    z: number;
}

export interface Tri {
    positionIndices: VertexIndices;
    texcoordIndices?: VertexIndices;
    normalIndices?: VertexIndices;
    material: string;
}

/* eslint-disable */
export enum MaterialType { solid, textured }
/* eslint-enable */
export interface SolidMaterial { colour: RGB; type: MaterialType.solid }
export interface TexturedMaterial { path: string; type: MaterialType.textured }
export type MaterialMap = {[key: string]: (SolidMaterial | TexturedMaterial)};

export class Mesh extends Warnable {
    public readonly id: string;

    private _vertices: Vector3[];
    private _normals!: Vector3[];
    private _uvs!: UV[];
    private _tris!: Tri[];
    private _materials!: MaterialMap;
    private _loadedTextures: { [materialName: string]: Texture };
    public static desiredHeight = 8.0;

    constructor(vertices: Vector3[], normals: Vector3[], uvs: UV[], tris: Tri[], materials: MaterialMap) {
        super();
        this.id = getRandomID();

        this._vertices = vertices;
        this._normals = normals;
        this._uvs = uvs;
        this._tris = tris;
        this._materials = materials;
        this._loadedTextures = {};
    }

    public processMesh() {
        this._checkMesh();
        this._checkMaterials();

        this._centreMesh();
        this._normaliseMesh();

        this._loadTextures();
    }

    public getBounds() {
        const bounds = Bounds.getInfiniteBounds();
        for (const vertex of this._vertices) {
            bounds.extendByPoint(vertex);
        }
        return bounds;
    }

    public translateMesh(offset: Vector3) {
        this._vertices.forEach((vertex) => {
            vertex.add(offset);
        });
    }

    public scaleMesh(scaleFactor: number) {
        this._vertices.forEach((vertex) => {
            vertex.mulScalar(scaleFactor);
        });
    }

    private _checkMesh() {
        // TODO: Check indices exist

        if (this._vertices.length === 0) {
            throw new CustomError('No verticies were loaded');
        }

        if (this._tris.length === 0) {
            throw new CustomError('No triangles were loaded');
        }
    }

    private _checkMaterials() {
        if (Object.keys(this._materials).length === 0) {
            throw new CustomError('Loaded mesh has no materials');
        }

        // Check used materials exist
        let wasRemapped = false;
        let debugName = (Math.random() + 1).toString(36).substring(7);
        while (debugName in this._materials) {
            debugName = (Math.random() + 1).toString(36).substring(7);
        }

        const missingMaterials = new Set<string>();
        for (const tri of this._tris) {
            if (!(tri.material in this._materials)) {
                missingMaterials.add(tri.material);
                wasRemapped = true;
                tri.material = debugName;
            }
        }
        if (wasRemapped) {
            LOG_WARN('Triangles use these materials but they were not found', missingMaterials);
            this.addWarning('Some materials were not loaded correctly');
            this._materials[debugName] = {
                type: MaterialType.solid,
                colour: RGB.white,
            };
        }
        
        // Check texture paths are absolute and exist
        for (const materialName in this._materials) {
            const material = this._materials[materialName];
            if (material.type === MaterialType.textured) {
                ASSERT(path.isAbsolute(material.path), 'Material texture path not absolute');
                if (!fs.existsSync(material.path)) {
                    this.addWarning(`Could not find ${material.path}`);
                    LOG_WARN(`Could not find ${material.path} for material ${materialName}, changing to solid-white material`);
                    this._materials[materialName] = {
                        type: MaterialType.solid,
                        colour: RGB.white,
                    };
                }
            }
        }
    }

    private _centreMesh() {
        /*
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
        */
        const centre = this.getBounds().getCentre();
        
        if (!centre.isNumber()) {
            throw new CustomError('Could not find centre of mesh');
        }
        LOG('Centre', centre);

        // Translate each triangle
        this.translateMesh(centre.negate());
    }

    private _normaliseMesh() {
        const bounds = this.getBounds();
        const size = Vector3.sub(bounds.max, bounds.min);
        const scaleFactor = Mesh.desiredHeight / size.y;

        if (isNaN(scaleFactor) || !isFinite(scaleFactor)) {
            throw new CustomError('<b>Could not scale mesh correctly</b>: Mesh is likely 2D, rotate it so that it has a non-zero height');
        } else {
            this.scaleMesh(scaleFactor);
        }
    }

    private _loadTextures() {
        this._loadedTextures = {};
        for (const tri of this._tris) {
            const material = this._materials[tri.material];
            if (material.type == MaterialType.textured) {
                if (!(tri.material in this._loadedTextures)) {
                    this._loadedTextures[tri.material] = new Texture(material.path);
                }
            }
        }
    }

    public getVertices(triIndex: number) {
        const tri = this._tris[triIndex];
        return {
            v0: this._vertices[tri.positionIndices.x],
            v1: this._vertices[tri.positionIndices.y],
            v2: this._vertices[tri.positionIndices.z],
        };
    }

    public getUVs(triIndex: number) {
        const tri = this._tris[triIndex];
        if (tri.texcoordIndices) {
            return {
                uv0: this._uvs[tri.texcoordIndices.x] || new UV(0.0, 0.0),
                uv1: this._uvs[tri.texcoordIndices.y] || new UV(0.0, 0.0),
                uv2: this._uvs[tri.texcoordIndices.z] || new UV(0.0, 0.0),
            };
        }
        return {
            uv0: new UV(0.0, 0.0),
            uv1: new UV(0.0, 0.0),
            uv2: new UV(0.0, 0.0),
        };
    }

    public getNormals(triIndex: number) {
        const vertexData = this.getVertices(triIndex);
        const faceNormal = new Triangle(vertexData.v0, vertexData.v1, vertexData.v2).getNormal();
        const tri = this._tris[triIndex];
        if (tri.normalIndices) {
            return {
                v0: this._normals[tri.normalIndices.x] || faceNormal,
                v1: this._normals[tri.normalIndices.y] || faceNormal,
                v2: this._normals[tri.normalIndices.z] || faceNormal,
            };
        }
        return {
            v0: faceNormal,
            v1: faceNormal,
            v2: faceNormal,
        };
    }

    public getUVTriangle(triIndex: number): UVTriangle {
        const vertices = this.getVertices(triIndex);
        const texcoords = this.getUVs(triIndex);
        return new UVTriangle(
            vertices.v0,
            vertices.v1,
            vertices.v2,
            texcoords.uv0,
            texcoords.uv1,
            texcoords.uv2,
        );
    }

    public getMaterialByTriangle(triIndex: number) {
        return this._tris[triIndex].material;
    }

    public getMaterialByName(materialName: string) {
        return this._materials[materialName];
    }

    public getMaterials() {
        return this._materials;
    }

    public sampleMaterial(materialName: string, uv: UV, textureFiltering: TextureFiltering) {
        ASSERT(materialName in this._materials, 'Sampling material that does not exist');
        const material = this._materials[materialName];
        if (material.type === MaterialType.solid) {
            return material.colour;
        } else {
            ASSERT(materialName in this._loadedTextures, 'Sampling texture that is not loaded');
            return this._loadedTextures[materialName].getRGB(uv, textureFiltering);
        }
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
        const newVertices = new Array<Vector3>(this._vertices.length);
        for (let i = 0; i < this._vertices.length; ++i) {
            newVertices[i] = this._vertices[i].copy();
        }

        const newNormals = new Array<Vector3>(this._normals.length);
        for (let i = 0; i < this._normals.length; ++i) {
            newNormals[i] = this._normals[i].copy();
        }

        const newUVs = new Array<UV>(this._uvs.length);
        for (let i = 0; i < this._uvs.length; ++i) {
            newUVs[i] = this._uvs[i].copy();
        }

        const newTris = new Array<Tri>(this._tris.length);
        for (let i = 0; i < this._tris.length; ++i) {
            // FIXME: Replace
            newTris[i] = JSON.parse(JSON.stringify(this._tris[i]));
        }

        const materials: { [materialName: string]: (SolidMaterial | TexturedMaterial) } = {}; // JSON.parse(JSON.stringify(this.materials));
        for (const materialName in this._materials) {
            const material = this._materials[materialName];
            if (material.type === MaterialType.solid) {
                materials[materialName] = {
                    type: MaterialType.solid,
                    colour: material.colour.copy(),
                };
            } else {
                materials[materialName] = {
                    type: MaterialType.textured,
                    path: material.path,
                };
            };
        }

        return new Mesh(newVertices, newNormals, newUVs, newTris, materials);
    }

    public getTriangleCount(): number {
        return this._tris.length;
    }
}
