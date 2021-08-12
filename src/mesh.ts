import * as twgl from "twgl.js";
import * as fs from "fs";
import * as path from "path";
//import { expandVertexData } from "expand-vertex-data";
const expandVertexData: any = require("expand-vertex-data");

import { Triangle } from "./triangle";
import { Vector3 } from "./vector";
import { RGB } from "./util";


interface objData {
    vertexNormals: Array<number>;
    vertexUVs: Array<number>;
    vertexPositions: Array<number>;
    vertexNormalIndices: Array<number>;
    vertexUVIndices: Array<number>;
    vertexPositionIndices: Array<number>;
    vertexMaterial: Array<string>;
};

interface Materials {
    [materialName: string]: (FillMaterial | TextureMaterial)
}

export interface FillMaterial {
    readonly type: MaterialType.Fill
    diffuseColour: RGB    
}

export interface TextureMaterial {
    readonly type: MaterialType.Texture
    texturePath: string,
    texture?: WebGLTexture
}

export enum MaterialType {
    Texture,
    Fill
}

export interface MaterialTriangles {
    material: (FillMaterial | TextureMaterial);
    triangles: Array<Triangle>
}

export class Mesh {

    //public materialTriangles: {[materialName: string]: Array<MaterialTriangles>};
    public materialTriangles: Array<MaterialTriangles> = [];

    private _gl: WebGLRenderingContext;
    private objPath: path.ParsedPath;
    private mtlPath?: string;
    //private _materials: Materials;
    private _data: {
        position: Float32Array;
        texcoord: Float32Array;
        indices: Uint16Array;
        materialNames: Array<string>;
    }
    private _materialIndices: {[materialName: string]: Array<number>}

    constructor(objPathString: string, gl: WebGLRenderingContext) {

        this.objPath = path.parse(objPathString);
        //this.materialTriangles: Array<MaterialTriangles>;
        this._gl = gl;

        // Parse .obj
        const wavefrontString = fs.readFileSync(objPathString).toString('utf8');
        const parsedJSON = this._parseWavefrontObj(wavefrontString);

        if (this.mtlPath) {
            if (!path.isAbsolute(this.mtlPath)) {
                this.mtlPath = path.join(this.objPath.dir, this.mtlPath);
            }
        } else {
            throw Error("No .mtl file found.");
        }

        // Parse .mtl
        const materialString = fs.readFileSync(this.mtlPath).toString('utf8');
        const materials = this._parseMaterial(materialString);

        // FIXME: Fix quad faces
        //console.log(expandVertexData.expandVertexData(null, null));
        const expanded = expandVertexData(parsedJSON, {facesToTriangles: true});

        this._data = {
            position: expanded.positions,
            texcoord: expanded.uvs,
            indices: expanded.positionIndices,
            materialNames: parsedJSON.vertexMaterial
        };

        this._materialIndices = {};
        for (let i = 0; i < parsedJSON.vertexMaterial.length; ++i) {
            const materialName = parsedJSON.vertexMaterial[i];
            const index = expanded.positionIndices[i];
            if (this._materialIndices[materialName]) {
                this._materialIndices[materialName].push(index);
            } else {
                this._materialIndices[materialName] = [index];
            }
        }

        this._parseTriangles(materials);
        this._loadTextures(materials);
    }

    private _addMaterial(materialsJSON: Materials, materialName: string, materialDiffuseColour: RGB, materialDiffuseTexturePath: string) {
        console.log(materialName, materialDiffuseColour, materialDiffuseTexturePath);
        if (materialDiffuseTexturePath !== "") {
            materialsJSON[materialName] = {
                texturePath: materialDiffuseTexturePath,
                type: MaterialType.Texture
            };
        } else if (materialName !== "") {
            materialsJSON[materialName] = {
                diffuseColour: materialDiffuseColour,
                type: MaterialType.Fill
            };
        }
    }

    private _parseMaterial(materialString: string): Materials {
        var materialsJSON: Materials = {};

        const lines = materialString.split('\n');

        let materialName: string = "";
        let materialDiffuseColour: RGB = {r: 1.0, g: 1.0, b: 1.0};
        let materialDiffuseTexturePath: string = "";

        for (let i = 0; i < lines.length; ++i) {
            const line = lines[i];
            const lineTokens = line.trim().split(/\s+/);

            switch (lineTokens[0]) {
                case "newmtl":
                    this._addMaterial(materialsJSON, materialName, materialDiffuseColour, materialDiffuseTexturePath);
                    materialName = lineTokens[1];
                    materialDiffuseColour = {r: 0, g: 0, b: 0};
                    materialDiffuseTexturePath = ""
                    break;

                case "Kd":
                    const diffuseColour = lineTokens.slice(1).map(x => parseFloat(x))
                    if (!diffuseColour || diffuseColour.length != 3) {
                        throw Error(`Could not parse .mtl file. (Line ${i+1})`);
                    }
                    if (diffuseColour.some(x => Number.isNaN(x))) {
                        throw Error(`Could not parse .mtl file. (Line ${i+1})`);
                    }
                    materialDiffuseColour = {
                        r: diffuseColour[0], g: diffuseColour[1], b: diffuseColour[2]
                    };
                    break;

                case "map_Kd":
                    if (!lineTokens[1]) {
                        throw Error(`No valid path to texture in .mtl file. (Line ${i+1})`);
                    }
                    let texturePath = lineTokens[1];
                    if (!path.isAbsolute(texturePath)) {
                        texturePath = path.join(this.objPath.dir, texturePath);
                    }
                    if (!fs.existsSync(texturePath)) {
                        console.error(texturePath);
                        throw Error(`Cannot load texture ${texturePath}`);
                    }
                    const _path = path.parse(texturePath);
                    if (_path.ext.toLowerCase() != ".png") {
                        throw Error(`Can only load .png textures`);
                    }

                    materialDiffuseTexturePath = texturePath;
                    break;
            }
        }

        this._addMaterial(materialsJSON, materialName, materialDiffuseColour, materialDiffuseTexturePath);

        return materialsJSON;
    }

    /*
        DISCLAIMER: This is a modified version of wavefront-obj-parser
        to include .mtl data (https://www.npmjs.com/package/wavefront-obj-parser)
    */
    // TODO: Just re-write this whole thing, wtf have I done, these types tho
    _parseWavefrontObj(wavefrontString: string): objData {

        const vertexInfoNameMap: {[key: string]: string} = {v: 'vertexPositions', vt: 'vertexUVs', vn: 'vertexNormals'};

        var parsedJSON: {[key: string]: Array<number>} = {
            vertexNormals: [],
            vertexUVs: [],
            vertexPositions: [],
            vertexNormalIndices: [],
            vertexUVIndices: [],
            vertexPositionIndices: [],
        };
        var vertexMaterial: Array<string> = [];

        var linesInWavefrontObj = wavefrontString.split('\n');
        var currentMaterial: string = "";

        // Loop through and parse every line in our .obj file
        for (let i = 0; i < linesInWavefrontObj.length; i++) {
            const currentLine = linesInWavefrontObj[i];
            // Tokenize our current line
            const currentLineTokens = currentLine.trim().split(/\s+/);
            // vertex position, vertex texture, or vertex normal
            const vertexInfoType = vertexInfoNameMap[currentLineTokens[0]];

            if (vertexInfoType) {
                for (let k = 1; k < currentLineTokens.length; k++) {
                    parsedJSON[vertexInfoType].push(parseFloat(currentLineTokens[k]));
                }
                continue;
            }

            switch (currentLineTokens[0]) {
                case "mtllib":
                    this.mtlPath = currentLineTokens[1];
                    break;
                case "usemtl":
                    currentMaterial = currentLineTokens[1];
                    break;
                case "f":
                    // Get our 4 sets of vertex, uv, and normal indices for this face
                    for (let k = 1; k < 5; k++) {
                        // If there is no fourth face entry then this is specifying a triangle
                        // in this case we push `-1`
                        // Consumers of this module should check for `-1` before expanding face data
                        if (k === 4 && !currentLineTokens[4]) {
                            parsedJSON.vertexPositionIndices.push(-1);
                            parsedJSON.vertexUVIndices.push(-1);
                            parsedJSON.vertexNormalIndices.push(-1);
                            //parsedJSON.vertexMaterial.push(currentMaterial);
                        } else {
                            var indices = currentLineTokens[k].split('/');
                            parsedJSON.vertexPositionIndices.push(parseInt(indices[0], 10) - 1); // We zero index
                            parsedJSON.vertexUVIndices.push(parseInt(indices[1], 10) - 1); // our face indices
                            parsedJSON.vertexNormalIndices.push(parseInt(indices[2], 10) - 1); // by subtracting 1
                            vertexMaterial.push(currentMaterial);
                        }
                    }
            } 
        }

        
        return {
            vertexNormals: parsedJSON["vertexNormals"],
            vertexUVs: parsedJSON["vertexUVs"],
            vertexPositions: parsedJSON["vertexPositions"],
            vertexNormalIndices: parsedJSON["vertexNormalIndices"],
            vertexUVIndices: parsedJSON["vertexUVIndices"],
            vertexPositionIndices: parsedJSON["vertexPositionIndices"],
            vertexMaterial: vertexMaterial
        }
    }


    _parseTriangles(materials: Materials) {
        this.materialTriangles = [];

        for (const materialName in this._materialIndices) {
            let triangles = [];
            const indices = this._materialIndices[materialName];

            for (let i = 0; i < indices.length; i += 3) {
                const i0 = indices[i];
                const i1 = indices[i + 1];
                const i2 = indices[i + 2];

                const v0 = this._data.position.slice(3 * i0, 3 * i0 + 3);
                const v1 = this._data.position.slice(3 * i1, 3 * i1 + 3);
                const v2 = this._data.position.slice(3 * i2, 3 * i2 + 3);

                const uv0 = this._data.texcoord.slice(2 * i0, 2 * i0 + 2);
                const uv1 = this._data.texcoord.slice(2 * i1, 2 * i1 + 2);
                const uv2 = this._data.texcoord.slice(2 * i2, 2 * i2 + 2);

                const v0_ = new Vector3(v0[0], v0[1], v0[2]);
                const v1_ = new Vector3(v1[0], v1[1], v1[2]);
                const v2_ = new Vector3(v2[0], v2[1], v2[2]);

                triangles.push(new Triangle(v0_, v1_, v2_, {u: uv0[0], v: uv0[1]}, {u: uv1[0], v: uv1[1]}, {u: uv2[0], v: uv2[1]}));
            }

            this.materialTriangles.push({
                material: materials[materialName],
                triangles: triangles
            });
        }
    }

    _loadTextures(materials: Materials) {
        for (const materialName in materials) {
            if (materials[materialName].type == MaterialType.Texture) {
                const material = <TextureMaterial> materials[materialName];
                material.texture = twgl.createTexture(this._gl, {
                    src: material.texturePath,
                    mag: this._gl.LINEAR
                });
                materials[materialName] = material;
            }
        }
    }

}

module.exports.Mesh = Mesh;