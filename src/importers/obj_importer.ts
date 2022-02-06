import * as fs from 'fs';
import path from 'path';
const OBJFile = require('obj-file-parser');
const mtlParser = require('mtltojs');

import { IImporter } from '../importer';
import { MaterialType, Mesh, SolidMaterial, TexturedMaterial, Tri } from '../mesh';
import { Vector3 } from '../vector';
import { UV, assert, RGB } from '../util';

export class ObjImporter extends IImporter {
    private _vertices!: Vector3[];
    private _uvs!: UV[];
    private _tris!: Tri[];
    private _materials!: {[key: string]: (SolidMaterial | TexturedMaterial)};
    private _mtlLibs!: string[];

    override createMesh(filePath: string): Mesh {
        assert(path.isAbsolute(filePath));
        this._parseOBJ(filePath);

        assert(this._mtlLibs.length > 0);
        if (this._mtlLibs.length > 1) {
            console.warn('Multiple mtl libs found, only the first will be used');
        }
        let mtlPath = this._mtlLibs[0];
        if (!path.isAbsolute(mtlPath)) {
            const objPath = path.parse(filePath);
            mtlPath = path.join(objPath.dir, mtlPath);
        }

        assert(path.isAbsolute(mtlPath));
        this._parseMTL(mtlPath);

        return new Mesh(this._vertices, this._uvs, this._tris, this._materials);
    }

    private _parseOBJ(path: string) {
        const fileContents = fs.readFileSync(path, 'utf-8');
        const objFile = new OBJFile(fileContents);
        const output = objFile.parse();

        this._mtlLibs = output.materialLibraries;

        for (const modelName in output.models) {
            const model = output.models[modelName];
            // Fill vertices
            this._vertices = [];
            for (const vertex of model.vertices) {
                this._vertices.push(new Vector3(vertex.x, vertex.y, vertex.z));
            }
            // Fill UVs
            this._uvs = [];
            for (const uv of model.textureCoords) {
                this._uvs.push({ u: uv.u, v: uv.v });
            }
            // Fill tris
            this._tris = [];
            for (const tri of model.faces) {
                if (tri.vertices.length === 3) {
                    const iX = tri.vertices[0].vertexIndex - 1;
                    const iXUV = tri.vertices[0].textureCoordsIndex - 1;
                    const iY = tri.vertices[1].vertexIndex - 1;
                    const iYUV = tri.vertices[1].textureCoordsIndex - 1;
                    const iZ = tri.vertices[2].vertexIndex - 1;
                    const iZUV = tri.vertices[2].textureCoordsIndex - 1;
                    const material = tri.material;
                    this._tris.push({
                        iX: iX, iY: iY, iZ: iZ,
                        iXUV: iXUV, iYUV: iYUV, iZUV: iZUV,
                        material: material,
                    });
                } else if (tri.vertices.length === 4) {
                    const iX = tri.vertices[0].vertexIndex - 1;
                    const iXUV = tri.vertices[0].textureCoordsIndex - 1;
                    const iY = tri.vertices[1].vertexIndex - 1;
                    const iYUV = tri.vertices[1].textureCoordsIndex - 1;
                    const iZ = tri.vertices[2].vertexIndex - 1;
                    const iZUV = tri.vertices[2].textureCoordsIndex - 1;
                    const iW = tri.vertices[3].vertexIndex - 1;
                    const iWUV = tri.vertices[3].textureCoordsIndex - 1;
                    const material = tri.material;
                    this._tris.push({
                        iX: iW, iY: iY, iZ: iX,
                        iXUV: iWUV, iYUV: iYUV, iZUV: iXUV,
                        material: material,
                    });
                    this._tris.push({
                        iX: iW, iY: iZ, iZ: iY,
                        iXUV: iWUV, iYUV: iZUV, iZUV: iYUV,
                        material: material,
                    });
                }
            }
        }
    }

    private _parseMTL(mtlPath: string) {
        const output = mtlParser.parseSync(mtlPath);
        const materials = output.data.data.material;

        this._materials = {};
        for (const material of materials) {
            if (material?.texture_map?.diffuse) {
                let texPath = material.texture_map.diffuse.file;
                if (!path.isAbsolute(texPath)) {
                    const parsedPath = path.parse(mtlPath);
                    texPath = path.join(parsedPath.dir, texPath);
                }
                this._materials[material.name] = { type: MaterialType.textured, path: texPath };
            } else if (material?.diffuse) {
                const rgb = material.diffuse.vals;
                this._materials[material.name] = { type: MaterialType.solid, colour: RGB.fromArray(rgb) };
            } else {
                assert(false);
            }
        }
    }
}
