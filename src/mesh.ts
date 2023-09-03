import path from 'path';

import { Bounds } from './bounds';
import { RGBA, RGBAColours, RGBAUtil } from './colour';
import { LOC } from './localiser';
import { degreesToRadians } from './math';
import { StatusHandler } from './status';
import { Texture, TextureConverter, TImageFiletype, TImageRawWrap, TTransparencyOptions } from './texture';
import { Triangle, UVTriangle } from './triangle';
import { getRandomID, UV } from './util';
import { AppError, ASSERT } from './util/error_util';
import { LOG, LOG_WARN } from './util/log_util';
import { TTexelExtension, TTexelInterpolation } from './util/type_util';
import { Vector3 } from './vector';

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
type BaseMaterial = {
    needsAttention: boolean, // True if the user should make edits to this material
}

export type SolidMaterial = BaseMaterial & {
    type: MaterialType.solid,
    colour: RGBA,
    canBeTextured: boolean,
}
export type TexturedMaterial = BaseMaterial & {
    type: MaterialType.textured,
    diffuse?: TImageRawWrap,
    interpolation: TTexelInterpolation,
    extension: TTexelExtension,
    transparency: TTransparencyOptions,
}
export type MaterialMap = Map<string, SolidMaterial | TexturedMaterial>;

export class Mesh {
    public readonly id: string;

    public _vertices: Vector3[];
    public _normals!: Vector3[];
    public _uvs!: UV[];
    public _tris!: Tri[];

    private _materials!: MaterialMap;
    private _loadedTextures: Map<string, Texture>;

    constructor(vertices: Vector3[], normals: Vector3[], uvs: UV[], tris: Tri[], materials: MaterialMap) {
        this.id = getRandomID();

        this._vertices = vertices;
        this._normals = normals;
        this._uvs = uvs;
        this._tris = tris;
        this._materials = materials;
        this._loadedTextures = new Map();
    }

    // TODO: Always check
    public processMesh(pitch: number, roll: number, yaw: number) {
        this._checkMesh();
        this._checkMaterials();

        this._centreMesh();
        this._rotateMesh(pitch, roll, yaw);
        this._normaliseMesh();

        this._loadTextures();
    }

    private _rotateMesh(pitch: number, roll: number, yaw: number) {
        const cosa = Math.cos(yaw * degreesToRadians);
        const sina = Math.sin(yaw * degreesToRadians);

        const cosb = Math.cos(pitch * degreesToRadians);
        const sinb = Math.sin(pitch * degreesToRadians);

        const cosc = Math.cos(roll * degreesToRadians);
        const sinc = Math.sin(roll * degreesToRadians);

        const Axx = cosa*cosb;
        const Axy = cosa*sinb*sinc - sina*cosc;
        const Axz = cosa*sinb*cosc + sina*sinc;

        const Ayx = sina*cosb;
        const Ayy = sina*sinb*sinc + cosa*cosc;
        const Ayz = sina*sinb*cosc - cosa*sinc;

        const Azx = -sinb;
        const Azy = cosb*sinc;
        const Azz = cosb*cosc;

        this._vertices.forEach((vertex) => {
            const px = vertex.x;
            const py = vertex.y;
            const pz = vertex.z;

            vertex.x = Axx * px + Axy * py + Axz * pz;
            vertex.y = Ayx * px + Ayy * py + Ayz * pz;
            vertex.z = Azx * px + Azy * py + Azz * pz;
        });
    }

    public getBounds() {
        const bounds = Bounds.getInfiniteBounds();
        if (this._transform) {
            for (const vertex of this._vertices) {
                bounds.extendByPoint(this._transform(vertex));
            }
        } else {
            for (const vertex of this._vertices) {
                bounds.extendByPoint(vertex);
            }
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
            throw new AppError(LOC('import.no_vertices_loaded'));
        }

        if (this._tris.length === 0) {
            throw new AppError(LOC('import.no_triangles_loaded'));
        }

        if (this._tris.length >= 100_000) {
            StatusHandler.warning(LOC('import.too_many_triangles', { count: this._tris.length }));
        }

        StatusHandler.info(LOC('import.vertex_triangle_count', { vertex_count: this._vertices.length, triangle_count: this._tris.length }));

        // Give warning if normals are not defined
        let giveNormalsWarning = false;
        for (let triIndex = 0; triIndex < this.getTriangleCount(); ++triIndex) {
            const tri = this._tris[triIndex];
            if (tri.normalIndices) {
                const xWellDefined = tri.normalIndices.x < this._normals.length;
                const yWellDefined = tri.normalIndices.y < this._normals.length;
                const zWellDefined = tri.normalIndices.z < this._normals.length;
                if (!xWellDefined || !yWellDefined || !zWellDefined) {
                    giveNormalsWarning = true;
                    break;
                }
            }
            if (!tri.normalIndices) {
                giveNormalsWarning = true;
                break;
            }
        }
        if (giveNormalsWarning) {
            StatusHandler.warning(LOC('import.missing_normals'));
        };
    }

    private _checkMaterials() {
        // Check used materials exist
        const usedMaterials = new Set<string>();
        const missingMaterials = new Set<string>();
        for (const tri of this._tris) {
            if (!this._materials.has(tri.material)) {
                // This triangle makes use of a material we don't have info about
                // Try infer details about this material and add it to our materials

                if (tri.texcoordIndices === undefined) {
                    // No texcoords are defined, therefore make a solid material
                    this._materials.set(tri.material, {
                        type: MaterialType.solid,
                        colour: RGBAUtil.randomPretty(),
                        canBeTextured: false,
                        needsAttention: true,
                    });
                } else {
                    // Texcoords exist
                    this._materials.set(tri.material, {
                        type: MaterialType.solid,
                        colour: RGBAUtil.randomPretty(),
                        canBeTextured: true,
                        needsAttention: true,
                    });
                }

                missingMaterials.add(tri.material);
            }

            usedMaterials.add(tri.material);
        }

        const materialsToRemove = new Set<string>();
        this._materials.forEach((material, materialName) => {
            if (!usedMaterials.has(materialName)) {
                LOG_WARN(`'${materialName}' is not used by any triangles, removing...`);
                materialsToRemove.add(materialName);
            }
        });

        materialsToRemove.forEach((materialName) => {
            this._materials.delete(materialName);
        });

        if (missingMaterials.size > 0) {
            LOG_WARN('Triangles use these materials but they were not found', missingMaterials);
        }

        // Check texture paths are absolute and exist
        this._materials.forEach((material, materialName) => {
            // TODO Unimplemented
            /*
            if (material.type === MaterialType.textured) {
                ASSERT(path.isAbsolute(material.path), 'Material texture path not absolute');
                if (!fs.existsSync(material.path)) {
                    LOG_WARN(`Could not find ${material.path} for material ${materialName}, changing to solid material`);
                    this._materials.set(materialName, {
                        type: MaterialType.solid,
                        colour: RGBAUtil.copy(RGBAColours.MAGENTA),
                        canBeTextured: true,
                        needsAttention: true,
                    });
                } else {
                    const parsedPath = path.parse(material.path);
                    if (parsedPath.ext === '.tga') {
                        material.path = TextureConverter.createPNGfromTGA(material.path);
                    }
                }
            }
            */
        });

        // Deduce default texture wrap mode for each material type
        const materialsWithUVsOutOfBounds = new Set<string>();
        this._tris.forEach((tri, triIndex) => {
            if (materialsWithUVsOutOfBounds.has(tri.material)) {
                // Already know this material has OOB UVs so skip
                return;
            }

            const uv = this.getUVs(triIndex);
            const uvsOutOfBounds =
                (uv.uv0.u < 0.0) || (uv.uv0.u > 1.0) ||
                (uv.uv0.v < 0.0) || (uv.uv0.v > 1.0) ||
                (uv.uv1.u < 0.0) || (uv.uv1.u > 1.0) ||
                (uv.uv1.v < 0.0) || (uv.uv1.v > 1.0) ||
                (uv.uv2.u < 0.0) || (uv.uv2.u > 1.0) ||
                (uv.uv2.v < 0.0) || (uv.uv2.v > 1.0);

            if (uvsOutOfBounds) {
                materialsWithUVsOutOfBounds.add(tri.material);
            }
        });

        LOG(`Materials with OOB UVs`, JSON.stringify(materialsWithUVsOutOfBounds));

        this._materials.forEach((material, materialName) => {
            if (material.type === MaterialType.textured) {
                material.extension = materialsWithUVsOutOfBounds.has(materialName) ?
                    'repeat' :
                    'clamp';
            }
        });
    }

    private _centreMesh() {
        const centre = this.getBounds().getCentre();
        ASSERT(centre.isNumber(), 'Could not find centre of mesh');

        // Translate each triangle
        this.translateMesh(centre.negate());
    }

    private _normaliseMesh() {
        const bounds = this.getBounds();
        const size = Vector3.sub(bounds.max, bounds.min);
        const scaleFactor = 1.0 / size.y;

        if (isNaN(scaleFactor) || !isFinite(scaleFactor)) {
            throw new AppError(LOC('import.could_not_scale_mesh'));
        } else {
            this.scaleMesh(scaleFactor);
        }
    }

    private _loadTextures() {
        this._loadedTextures.clear();
        this._materials.forEach((material, materialName) => {
            if (material.type === MaterialType.textured && !this._loadedTextures.has(materialName)) {
                this._loadedTextures.set(materialName, new Texture({ diffuse: material.diffuse, transparency: material.transparency }));
            }
        });
    }

    public getVertices(triIndex: number) {
        const tri = this._tris[triIndex];
        if (this._transform) {
            return {
                v0: this._transform(this._vertices[tri.positionIndices.x]),
                v1: this._transform(this._vertices[tri.positionIndices.y]),
                v2: this._transform(this._vertices[tri.positionIndices.z]),
            };
        } else {
            return {
                v0: this._vertices[tri.positionIndices.x],
                v1: this._vertices[tri.positionIndices.y],
                v2: this._vertices[tri.positionIndices.z],
            };
        }
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
        const normals = this.getNormals(triIndex);
        const texcoords = this.getUVs(triIndex);
        return new UVTriangle(
            vertices.v0,
            vertices.v1,
            vertices.v2,
            normals.v0,
            normals.v1,
            normals.v2,
            texcoords.uv0,
            texcoords.uv1,
            texcoords.uv2,
        );
    }

    public getMaterialByTriangle(triIndex: number) {
        return this._tris[triIndex].material;
    }

    public getMaterialByName(materialName: string) {
        return this._materials.get(materialName);
    }

    public setMaterials(materialMap: MaterialMap) {
        this._materials = materialMap;
        this._loadTextures();
    }

    public getMaterials() {
        return this._materials;
    }

    public sampleTextureMaterial(materialName: string, uv: UV): RGBA {
        const material = this._materials.get(materialName);
        ASSERT(material !== undefined, `Sampling material that does not exist: ${materialName}`);
        ASSERT(material.type === MaterialType.textured, 'Sampling texture material of non-texture material');

        const texture = this._loadedTextures.get(materialName);
        ASSERT(texture !== undefined, 'Sampling texture that is not loaded');

        return texture.getRGBA(uv, material.interpolation, material.extension);
    }

    public getTriangleCount(): number {
        return this._tris.length;
    }

    private _transform?: (vertex: Vector3) => Vector3;
    public setTransform(transform: (vertex: Vector3) => Vector3) {
        this._transform = transform;
    }

    public clearTransform() {
        this._transform = undefined;
    }
}
