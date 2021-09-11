import * as twgl from "twgl.js";
import * as fs from "fs";
import * as path from "path";

import { Triangle } from "./triangle";
import { Vector3 } from "./vector";
import { RGB, UV } from "./util";
import { TextureFormat } from "./texture";

type VertexMap<T> = { [index: number]: T };


export class Vertex {

    public position: Vector3;
    public texcoord: UV
    public normal: Vector3;

    constructor(position: Vector3, texcoord: UV, normal: Vector3) {
        this.position = position;
        this.texcoord = texcoord;
        if (!texcoord) {
            this.texcoord = { u: 0, v: 0 };
        }

        this.normal = normal;
    }

    public static parseFromOBJ(
        vertexToken: string,
        vertexPositionMap: VertexMap<Vector3>,
        vertexTexcoordMap: VertexMap<UV>,
        vertexNormalMap: VertexMap<Vector3>,
    ) {
        const tokens = vertexToken.split("/");

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

export enum MaterialType {
    Texture,
    Fill
}

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

        let material: FillMaterial = { diffuseColour: { r: 1, g: 1, b: 1 }, type: MaterialType.Fill}
        this.materialData = material;
    }

    public addFace(face: Triangle) {
        this.faces.push(face);
    }

    public isFilled(): boolean {
        return this.name !== "" && this.faces.length > 0;
    }

    public attachMTLData(materialData: (FillMaterial | TextureMaterial)) {
        this.materialData = materialData;
    }

}

export class Mesh {

    public materials: Array<Material>

    constructor(objPathString: string, gl: WebGLRenderingContext) {
        // Parse .obj
        const wavefrontString = fs.readFileSync(objPathString).toString('utf8');
        const parsedOBJ = this._parseOBJFile(wavefrontString);
        
        // TODO: Create blank .mtl when not found
        if (!parsedOBJ.mtlPath) {
            throw Error("No .mtl file found.");
        }
        
        const objPath = path.parse(objPathString);
        if (!path.isAbsolute(parsedOBJ.mtlPath)) {
            parsedOBJ.mtlPath = path.join(objPath.dir, parsedOBJ.mtlPath);
        }
        
        // Parse .mtl
        const materialString = fs.readFileSync(parsedOBJ.mtlPath).toString('utf8');
        const parsedMTL = this._parseMaterial(materialString, objPath);


        this.materials = this._mergeMaterialData(parsedOBJ, parsedMTL);
        this._centreMesh();
        this._normaliseMesh();
    }

    private _addMaterial(materialsJSON: Materials, materialName: string, materialDiffuseColour: RGB, materialDiffuseTexturePath: string, materialFormat: TextureFormat) {
        console.log(materialName, materialDiffuseColour, materialDiffuseTexturePath);
        if (materialDiffuseTexturePath !== "") {
            materialsJSON[materialName] = {
                texturePath: materialDiffuseTexturePath,
                type: MaterialType.Texture,
                format: materialFormat
            };
        } else if (materialName !== "") {
            materialsJSON[materialName] = {
                diffuseColour: materialDiffuseColour,
                type: MaterialType.Fill
            };
        }
    }

    // TODO: Rewrite
    private _parseMaterial(materialString: string, objPath: path.ParsedPath): Materials {
        var materialsJSON: Materials = {};

        const lines = materialString.split('\n');

        let materialName: string = "";
        let materialDiffuseColour: RGB = { r: 1.0, g: 1.0, b: 1.0 };
        let materialDiffuseTexturePath: string = "";
        let materialTextureFormat: TextureFormat = TextureFormat.PNG;

        for (let i = 0; i < lines.length; ++i) {
            const line = lines[i];
            const lineTokens = line.trim().split(/\s+/);

            switch (lineTokens[0]) {
                case "newmtl":
                    this._addMaterial(materialsJSON, materialName, materialDiffuseColour, materialDiffuseTexturePath, materialTextureFormat);
                    materialName = lineTokens[1];
                    materialDiffuseColour = { r: 0, g: 0, b: 0 };
                    materialDiffuseTexturePath = ""
                    break;

                case "Kd":
                    const diffuseColour = lineTokens.slice(1).map(x => parseFloat(x))
                    if (!diffuseColour || diffuseColour.length != 3) {
                        throw Error(`Could not parse .mtl file. (Line ${i + 1})`);
                    }
                    if (diffuseColour.some(x => Number.isNaN(x))) {
                        throw Error(`Could not parse .mtl file. (Line ${i + 1})`);
                    }
                    materialDiffuseColour = {
                        r: diffuseColour[0], g: diffuseColour[1], b: diffuseColour[2]
                    };
                    break;

                case "map_Kd":
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
                    if (".png" === _path.ext.toLowerCase()) {
                        materialTextureFormat = TextureFormat.PNG;
                    }
                    else if ([".jpeg", ".jpg"].includes(_path.ext.toLowerCase())) {
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
        parsedOBJ.materials.forEach(material => {
            material.attachMTLData(parsedMTL[material.name]);
        });

        return parsedOBJ.materials;
    }


    private _parseOBJFile(wavefrontString: string): ParsedOBJ {
        const lines = wavefrontString.split("\n");

        let mtlPath: (string | undefined);

        let vertexPositionMap: VertexMap<Vector3> = {};
        let vertexTexcoordMap: VertexMap<UV> = {};
        let vertexNormalMap: VertexMap<Vector3> = {};

        let vertexPositionIndex = 1;
        let vertexTexcoordIndex = 1;
        let vertexNormalIndex = 1;

        let currentMaterial: Material = new Material("");
        let materials: Array<Material> = [];

        lines.forEach(line => {
            const tokens = line.split(" ");
            switch (tokens[0]) {
                case "mtllib":
                    mtlPath = tokens[1];
                    break;
                case "v":
                    vertexPositionMap[vertexPositionIndex++] = Vector3.parse(tokens[1], tokens[2], tokens[3]);
                    break;
                case "vn":
                    vertexNormalMap[vertexNormalIndex++] = Vector3.parse(tokens[1], tokens[2], tokens[3]);
                    break;
                case "vt":
                    vertexTexcoordMap[vertexTexcoordIndex++] = { u: parseFloat(tokens[1]), v: parseFloat(tokens[2]) };
                    break;
                case "usemtl":
                    if (currentMaterial.isFilled()) {
                        materials.push(currentMaterial);
                    }
                    currentMaterial = new Material(tokens[1]);
                    break;
                case "f":
                    const v0 = Vertex.parseFromOBJ(tokens[1], vertexPositionMap, vertexTexcoordMap, vertexNormalMap);
                    const v1 = Vertex.parseFromOBJ(tokens[2], vertexPositionMap, vertexTexcoordMap, vertexNormalMap);
                    const v2 = Vertex.parseFromOBJ(tokens[3], vertexPositionMap, vertexTexcoordMap, vertexNormalMap);

                    const face = new Triangle(v0, v1, v2);
                    currentMaterial.addFace(face);
                    break;
            }
        });

        if (currentMaterial.isFilled()) {
            materials.push(currentMaterial);
        }

        return {
            mtlPath: mtlPath,
            materials: materials
        }
    }


    // TODO: Factor in triangle's size, perform weighted sum
    // to prevent areas of dense triangles dominating
    private _centreMesh() {
        // Find the centre
        let centre = new Vector3(0, 0, 0);
        let count = 0;
        this.materials.forEach(material => {
            material.faces.forEach(face => {
                centre.add(face.getCentre());
                ++count;
            });
        });
        centre.divScalar(count);
        console.log(centre);

        // Translate each triangle
        this.materials.forEach(material => {
            material.faces.forEach(face => {
                face.v0.position = Vector3.sub(face.v0.position, centre);
                face.v1.position = Vector3.sub(face.v1.position, centre);
                face.v2.position = Vector3.sub(face.v2.position, centre);
                face.updateAABB();
            });
        });
    }


    /**
     *  Scale model so each imported model is the same size
     */
    private _normaliseMesh() {
        // Find the size
        let a = new Vector3(Infinity, Infinity, Infinity);
        let b = new Vector3(-Infinity, -Infinity, -Infinity);

        this.materials.forEach(material => {
            material.faces.forEach(face => {
                const aabb = face.getAABB();
                a.x = Math.min(a.x, aabb.a.x);
                a.y = Math.min(a.y, aabb.a.y);
                a.z = Math.min(a.z, aabb.a.z);
                b.x = Math.max(b.x, aabb.b.x);
                b.y = Math.max(b.y, aabb.b.y);
                b.z = Math.max(b.z, aabb.b.z);
            });
        });

        const size = Vector3.sub(b, a);
        const targetSize = 8.0;
        const scaleFactor = targetSize / Math.max(size.x, size.y, size.z);

        // Scale each triangle
        this.materials.forEach(material => {
            material.faces.forEach(face => {
                face.v0.position.mulScalar(scaleFactor);
                face.v1.position.mulScalar(scaleFactor);
                face.v2.position.mulScalar(scaleFactor);
                face.updateAABB();
            });
        });
    }

    public loadTextures(gl: WebGLRenderingContext) {
        this.materials.forEach(material => {
            if (material.materialData?.type === MaterialType.Texture) {
                material.materialData.texture = twgl.createTexture(gl, {
                    src: material.materialData.texturePath,
                    mag: gl.LINEAR
                });
            }
        });
    }

}