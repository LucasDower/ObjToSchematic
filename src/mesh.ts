import * as twgl from 'twgl.js';
import * as fs from 'fs';
import * as path from 'path';

import { Triangle } from './triangle';
import { Vector3 } from './vector';
import { RGB, UV, CustomError, Bounds } from './util';
import { TextureFormat } from './texture';
import { triangleArea } from './math';

type VertexMap<T> = { [index: number]: T };

export class Vertex {
    public position: Vector3;
    public texcoord: UV;
    public normal: Vector3;

    constructor(position: Vector3, texcoord: UV, normal: Vector3) {
        this.position = position;
        this.texcoord = texcoord;
        if (!texcoord) {
            this.texcoord = { u: 0, v: 0 };
        }

        this.normal = normal;
    }


    public copy() {
        return new Vertex(this.position.copy(), { u: this.texcoord.u, v: this.texcoord.v }, this.normal.copy());
    }

    public static parseFromOBJ(
        vertexToken: string,
        vertexPositionMap: VertexMap<Vector3>,
        vertexTexcoordMap: VertexMap<UV>,
        vertexNormalMap: VertexMap<Vector3>,
    ) {
        const tokens = vertexToken.split('/');

        const positionIndex = parseFloat(tokens[0]);
        const texcoordIndex = parseFloat(tokens[1]);
        const normalIndex = parseFloat(tokens[2]);

        const position = vertexPositionMap[positionIndex];
        const texcoord = vertexTexcoordMap[texcoordIndex];
        const normal = vertexNormalMap[normalIndex];

        return new Vertex(position, texcoord, normal);
    }
}


interface Materials {
    [materialName: string]: (FillMaterial | TextureMaterial)
}

interface ParsedOBJ {
    mtlPath: (string | undefined),
    materials: Array<Material>
}

export interface FillMaterial {
    readonly type: MaterialType.Fill,
    diffuseColour: RGB
}

export interface TextureMaterial {
    readonly type: MaterialType.Texture
    texturePath: string,
    texture?: WebGLTexture,
    format: TextureFormat
}

/* eslint-disable */
export enum MaterialType {
    Texture,
    Fill
}
/* eslint-enable */

export interface MaterialTriangles {
    material: (FillMaterial | TextureMaterial);
    triangles: Array<Triangle>
}

class Material {
    public name: string;
    public faces: Array<Triangle>;
    public materialData: (FillMaterial | TextureMaterial);

    constructor(name: string) {
        this.name = name;
        this.faces = [];

        const material: FillMaterial = { diffuseColour: { r: 1, g: 1, b: 1 }, type: MaterialType.Fill};
        this.materialData = material;
    }

    public addFace(face: Triangle) {
        this.faces.push(face);
    }

    public isFilled(): boolean {
        return this.name !== '' && this.faces.length > 0;
    }

    public attachMTLData(materialData: (FillMaterial | TextureMaterial)) {
        this.materialData = materialData;
    }
}

export class Mesh {
    public materials: Array<Material>;

    constructor(objPathString: string, mtlPathString: string) {
        // Parse .obj
        const wavefrontString = fs.readFileSync(objPathString).toString('utf8');
        const parsedOBJ = this._parseOBJFile(wavefrontString);
        const objPath = path.parse(objPathString);

        // Parse .mtl
        const materialString = fs.readFileSync(mtlPathString).toString('utf8');
        const parsedMTL = this._parseMaterial(materialString, objPath);

        this.materials = this._mergeMaterialData(parsedOBJ, parsedMTL);
        this._centreMesh();
        this._normaliseMesh();

        // TODO: Throw at source
        for (const material of this.materials) {
            if (material.materialData === undefined) {
                throw new CustomError('Could not link .obj with .mtl, possible mismatch?');
            }
        }
    }

    public getBounds() {
        const bounds: Bounds = {
            minX: Infinity,
            minY: Infinity,
            minZ: Infinity,
            maxX: -Infinity,
            maxY: -Infinity,
            maxZ: -Infinity,
        };
        for (const material of this.materials) {
            for (const face of material.faces) {
                const faceBounds = face.getBounds();
                bounds.minX = Math.min(faceBounds.minX, bounds.minX);
                bounds.minY = Math.min(faceBounds.minY, bounds.minY);
                bounds.minZ = Math.min(faceBounds.minZ, bounds.minZ);
                bounds.maxX = Math.max(faceBounds.maxX, bounds.maxX);
                bounds.maxY = Math.max(faceBounds.maxY, bounds.maxY);
                bounds.maxZ = Math.max(faceBounds.maxZ, bounds.maxZ);
            }
        }
        return bounds;
    }

    private _addMaterial(materialsJSON: Materials, materialName: string, materialDiffuseColour: RGB, materialDiffuseTexturePath: string, materialFormat: TextureFormat) {
        if (materialDiffuseTexturePath !== '') {
            materialsJSON[materialName] = {
                texturePath: materialDiffuseTexturePath,
                type: MaterialType.Texture,
                format: materialFormat,
            };
        } else if (materialName !== '') {
            materialsJSON[materialName] = {
                diffuseColour: materialDiffuseColour,
                type: MaterialType.Fill,
            };
        }
    }

    // TODO: Rewrite
    private _parseMaterial(materialString: string, objPath: path.ParsedPath): Materials {
        const materialsJSON: Materials = {};

        const lines = materialString.split('\n');

        let materialName: string = '';
        let materialDiffuseColour: RGB = { r: 1.0, g: 1.0, b: 1.0 };
        let materialDiffuseTexturePath: string = '';
        let materialTextureFormat: TextureFormat = TextureFormat.PNG;

        for (let i = 0; i < lines.length; ++i) {
            const line = lines[i];
            const lineTokens = line.trim().split(/\s+/);

            switch (lineTokens[0]) {
            case 'newmtl':
                this._addMaterial(materialsJSON, materialName, materialDiffuseColour, materialDiffuseTexturePath, materialTextureFormat);
                materialName = lineTokens[1];
                materialDiffuseColour = { r: 0, g: 0, b: 0 };
                materialDiffuseTexturePath = '';
                break;

            case 'Kd':
                const diffuseColour = lineTokens.slice(1).map((x) => parseFloat(x));
                if (!diffuseColour || diffuseColour.length != 3) {
                    throw Error(`Could not parse .mtl file. (Line ${i + 1})`);
                }
                if (diffuseColour.some((x) => Number.isNaN(x))) {
                    throw Error(`Could not parse .mtl file. (Line ${i + 1})`);
                }
                materialDiffuseColour = {
                    r: diffuseColour[0], g: diffuseColour[1], b: diffuseColour[2],
                };
                break;

            case 'map_Kd':
                if (!lineTokens[1]) {
                    throw Error(`No valid path to texture in .mtl file. (Line ${i + 1})`);
                }
                let texturePath = lineTokens[1];
                if (!path.isAbsolute(texturePath)) {
                    texturePath = path.join(objPath.dir, texturePath);
                }
                if (!fs.existsSync(texturePath)) {
                    console.error(texturePath);
                    throw Error(`Cannot load texture ${texturePath}`);
                }
                const _path = path.parse(texturePath);
                if ('.png' === _path.ext.toLowerCase()) {
                    materialTextureFormat = TextureFormat.PNG;
                } else if (['.jpeg', '.jpg'].includes(_path.ext.toLowerCase())) {
                    materialTextureFormat = TextureFormat.JPEG;
                } else {
                    throw Error(`Can only load PNG and JPEG textures`);
                }

                materialDiffuseTexturePath = texturePath;
                break;
            }
        }

        this._addMaterial(materialsJSON, materialName, materialDiffuseColour, materialDiffuseTexturePath, materialTextureFormat);

        return materialsJSON;
    }


    private _mergeMaterialData(parsedOBJ: ParsedOBJ, parsedMTL: Materials): Array<Material> {
        parsedOBJ.materials.forEach((material) => {
            material.attachMTLData(parsedMTL[material.name]);
        });

        return parsedOBJ.materials;
    }


    private _parseOBJFile(wavefrontString: string): ParsedOBJ {
        const lines = wavefrontString.split('\n');

        let mtlPath: (string | undefined);

        const vertexPositionMap: VertexMap<Vector3> = {};
        const vertexTexcoordMap: VertexMap<UV> = {};
        const vertexNormalMap: VertexMap<Vector3> = {};

        let vertexPositionIndex = 1;
        let vertexTexcoordIndex = 1;
        let vertexNormalIndex = 1;

        let currentMaterial: Material = new Material('');

        const materialMap: {[name: string]: Material} = {};
        // let materials: Array<Material> = [];

        lines.forEach((line) => {
            const tokens = line.split(' ');
            switch (tokens[0]) {
            case 'mtllib':
                mtlPath = tokens[1];
                break;
            case 'v':
                vertexPositionMap[vertexPositionIndex++] = Vector3.parse(line);
                break;
            case 'vn':
                vertexNormalMap[vertexNormalIndex++] = Vector3.parse(line);
                break;
            case 'vt':
                vertexTexcoordMap[vertexTexcoordIndex++] = { u: parseFloat(tokens[1]), v: parseFloat(tokens[2]) };
                break;
            }
        });

        lines.forEach((line) => {
            line = line.replace(/[\n\r]/g, '').trimEnd();
            const tokens = line.split(' ');
            switch (tokens[0]) {
            case 'usemtl':
                if (currentMaterial.isFilled() && !(currentMaterial.name in materialMap)) {
                    materialMap[currentMaterial.name] = currentMaterial;
                }
                if (tokens[1] in materialMap) {
                    console.log('Material already found', tokens[1]);
                    currentMaterial = materialMap[tokens[1]];
                } else {
                    console.log('New material', tokens[1]);
                    currentMaterial = new Material(tokens[1]);
                }
                break;
            case 'f':
                if (tokens.length === 5) {
                    // QUAD
                    const v1 = Vertex.parseFromOBJ(tokens[1], vertexPositionMap, vertexTexcoordMap, vertexNormalMap);
                    const v2 = Vertex.parseFromOBJ(tokens[2], vertexPositionMap, vertexTexcoordMap, vertexNormalMap);
                    const v3 = Vertex.parseFromOBJ(tokens[3], vertexPositionMap, vertexTexcoordMap, vertexNormalMap);
                    const v4 = Vertex.parseFromOBJ(tokens[4], vertexPositionMap, vertexTexcoordMap, vertexNormalMap);

                    const face = new Triangle(v4.copy(), v2.copy(), v1.copy());
                    const face2 = new Triangle(v4.copy(), v3.copy(), v2.copy());

                    currentMaterial.addFace(face);
                    currentMaterial.addFace(face2);
                } else if (tokens.length === 4) {
                    // TRI
                    const v0 = Vertex.parseFromOBJ(tokens[1], vertexPositionMap, vertexTexcoordMap, vertexNormalMap);
                    const v1 = Vertex.parseFromOBJ(tokens[2], vertexPositionMap, vertexTexcoordMap, vertexNormalMap);
                    const v2 = Vertex.parseFromOBJ(tokens[3], vertexPositionMap, vertexTexcoordMap, vertexNormalMap);

                    const face = new Triangle(v0, v1, v2);
                    currentMaterial.addFace(face);
                } else {
                    throw Error(`Unexpected number of face vertices, expected 3 or 4, got ${tokens.length - 1}`);
                }
                break;
            }
        });

        if (currentMaterial.isFilled() && !(currentMaterial.name in materialMap)) {
            materialMap[currentMaterial.name] = currentMaterial;
        }

        const materials: Array<Material> = [];
        for (const material in materialMap) {
            materials.push(materialMap[material]);
        }

        console.log(materials);

        return {
            mtlPath: mtlPath,
            materials: materials,
        };
    }


    private _centreMesh() {
        const centre = new Vector3(0, 0, 0);
        let totalWeight = 0;
        this.materials.forEach((material) => {
            material.faces.forEach((face) => {
                const k0 = Vector3.sub(face.v0.position, face.v1.position).magnitude();
                const k1 = Vector3.sub(face.v1.position, face.v2.position).magnitude();
                const k2 = Vector3.sub(face.v2.position, face.v0.position).magnitude();
                const weight = triangleArea(k0, k1, k2);
                totalWeight += weight;
                centre.add(face.getCentre().mulScalar(weight));
            });
        });
        centre.divScalar(totalWeight);

        // Translate each triangle
        this.materials.forEach((material) => {
            material.faces.forEach((face) => {
                face.v0.position = Vector3.sub(face.v0.position, centre);
                face.v1.position = Vector3.sub(face.v1.position, centre);
                face.v2.position = Vector3.sub(face.v2.position, centre);
            });
        });
    }


    /**
     *  Scale model so each imported model is the same size
     */
    private _normaliseMesh() {
        // Find the size
        const a = new Vector3(Infinity, Infinity, Infinity);
        const b = new Vector3(-Infinity, -Infinity, -Infinity);

        this.materials.forEach((material) => {
            material.faces.forEach((face) => {
                const aabb = face.getBounds();
                a.x = Math.min(a.x, aabb.minX);
                a.y = Math.min(a.y, aabb.minY);
                a.z = Math.min(a.z, aabb.minZ);
                b.x = Math.max(b.x, aabb.maxX);
                b.y = Math.max(b.y, aabb.maxY);
                b.z = Math.max(b.z, aabb.maxZ);
            });
        });

        const size = Vector3.sub(b, a);
        console.log('size', size);
        const targetSize = 8.0;
        // const scaleFactor = targetSize / Math.max(size.x, size.y, size.z);
        const scaleFactor = targetSize / size.z;
        console.log('scaleFactor', scaleFactor);

        // Scale each triangle
        this.materials.forEach((material) => {
            material.faces.forEach((face) => {
                face.v0.position = Vector3.mulScalar(face.v0.position, scaleFactor);
                face.v1.position = Vector3.mulScalar(face.v1.position, scaleFactor);
                face.v2.position = Vector3.mulScalar(face.v2.position, scaleFactor);
            });
        });
    }

    public loadTextures(gl: WebGLRenderingContext) {
        this.materials.forEach((material) => {
            if (material.materialData?.type === MaterialType.Texture) {
                material.materialData.texture = twgl.createTexture(gl, {
                    src: material.materialData.texturePath,
                    mag: gl.LINEAR,
                });
            }
        });
    }
}
