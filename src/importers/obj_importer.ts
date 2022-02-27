import { IImporter } from '../importer';
import { MaterialType, Mesh, SolidMaterial, TexturedMaterial, Tri } from '../mesh';
import { Vector3 } from '../vector';
import { UV, ASSERT, RGB, CustomError, LOG } from '../util';
import { UI } from '../ui/layout';
import { checkFractional, checkNaN } from '../math';

import fs from 'fs';
import path from 'path';
import { AppContext } from '../app_context';

export class ObjImporter extends IImporter {
    private _vertices: Vector3[] = [];
    private _uvs: UV[] = [];
    private _tris: Tri[] = [];
    private _materials: {[key: string]: (SolidMaterial | TexturedMaterial)} = {};
    
    private _mtlLibs: string[] = [];
    private _currentMaterialName: string = '';
    private _objPath?: path.ParsedPath;
    private _objParsers = [
        {
            regex: /mtllib (?<path>.*\.mtl)/,
            delegate: (match: { [key: string]: string }) => {
                this._mtlLibs.push(match.path);
            },
        },
        {
            regex: /usemtl (?<name>.*)/,
            delegate: (match: { [key: string]: string }) => {
                this._currentMaterialName = match.name;
            },
        },
        {
            regex: /v (?<x>.*) (?<y>.*) (?<z>.*)/,
            delegate: (match: { [key: string]: string }) => {
                const x = parseFloat(match.x);
                const y = parseFloat(match.y);
                const z = parseFloat(match.z);
                checkNaN(x, y, z);
                this._vertices.push(new Vector3(x, y, z));
            },
        },
        {
            regex: /vt (?<u>.*) (?<v>.*)/,
            delegate: (match: { [key: string]: string }) => {
                const u = parseFloat(match.u);
                const v = parseFloat(match.v);
                checkNaN(u, v);
                this._uvs.push(new UV(u, v));
            },
        },
        {
            regex: /f (?<ix>.*)\/(?<iuvx>.*)\/.* (?<iy>.*)\/(?<iuvy>.*)\/.* (?<iz>.*)\/(?<iuvz>.*)\/.* (?<iw>.*)\/(?<iuvw>.*)\//,
            delegate: (match: { [key: string]: string }) => {
                const iX = parseInt(match.ix) - 1;
                const iY = parseInt(match.iy) - 1;
                const iZ = parseInt(match.iz) - 1;
                const iW = parseInt(match.iw) - 1;
                const iUVx = parseInt(match.iuvx) - 1;
                const iUVy = parseInt(match.iuvy) - 1;
                const iUVz = parseInt(match.iuvz) - 1;
                const iUVw = parseInt(match.iuvw) - 1;
                checkNaN(iX, iY, iZ, iW);
                ASSERT(this._currentMaterialName);
                this._tris.push({
                    iX: iW,
                    iY: iY,
                    iZ: iX,
                    iXUV: iUVw,
                    iYUV: iUVy,
                    iZUV: iUVx,
                    material: this._currentMaterialName,
                });
                this._tris.push({
                    iX: iW,
                    iY: iZ,
                    iZ: iY,
                    iXUV: iUVw,
                    iYUV: iUVz,
                    iZUV: iUVy,
                    material: this._currentMaterialName,
                });
            },
        },
        {
            regex: /f (?<ix>.*)\/(?<iuvx>.*)\/.* (?<iy>.*)\/(?<iuvy>.*)\/.* (?<iz>.*)\/(?<iuvz>.*)\//,
            delegate: (match: { [key: string]: string }) => {
                const iX = parseInt(match.ix) - 1;
                const iY = parseInt(match.iy) - 1;
                const iZ = parseInt(match.iz) - 1;
                const iUVx = parseInt(match.iuvx) - 1;
                const iUVy = parseInt(match.iuvy) - 1;
                const iUVz = parseInt(match.iuvz) - 1;
                checkNaN(iX, iY, iZ);
                ASSERT(this._currentMaterialName);
                this._tris.push({
                    iX: iX,
                    iY: iY,
                    iZ: iZ,
                    iXUV: iUVx,
                    iYUV: iUVy,
                    iZUV: iUVz,
                    material: this._currentMaterialName,
                });
            },
        },
        {
            regex: /f (?<ix>.*) (?<iy>.*) (?<iz>.*)/,
            delegate: (match: { [key: string]: string }) => {
                const iX = parseInt(match.ix) - 1;
                const iY = parseInt(match.iy) - 1;
                const iZ = parseInt(match.iz) - 1;
                checkNaN(iX, iY, iZ);
                ASSERT(this._currentMaterialName);
                this._tris.push({
                    iX: iX,
                    iY: iY,
                    iZ: iZ,
                    iXUV: iX,
                    iYUV: iY,
                    iZUV: iZ,
                    material: this._currentMaterialName,
                });
            },
        },
    ];
    
    private _currentColour: RGB = RGB.black;
    private _currentTexture: string = '';
    private _materialReady: boolean = false;
    private _mtlParsers = [
        {
            regex: /newmtl (?<name>.*)/,
            delegate: (match: { [key: string]: string }) => {
                this._addCurrentMaterial();
                this._currentMaterialName = match.name;
                this._currentTexture = '';
                this._materialReady = false;
            },
        },
        {
            regex: /Kd (?<r>.*) (?<g>.*) (?<b>.*)/,
            delegate: (match: { [key: string]: string }) => {
                const r = parseFloat(match.r);
                const g = parseFloat(match.g);
                const b = parseFloat(match.b);
                checkNaN(r, g, b);
                checkFractional(r, g, b);
                this._currentColour = new RGB(r, g, b);
                this._materialReady = true;
            },
        },
        {
            regex: /map_Kd (?<path>.*)/,
            delegate: (match: { [key: string]: string }) => {
                let mtlPath = match.path;
                if (!path.isAbsolute(mtlPath)) {
                    ASSERT(this._objPath);
                    mtlPath = path.join(this._objPath.dir, mtlPath);
                }
                this._currentTexture = mtlPath;
                this._materialReady = true;
            },
        },
    ];

    override createMesh(): Mesh {
        const filePath = UI.Get.layout.import.elements.input.getCachedValue();
        ASSERT(path.isAbsolute(filePath));

        this._objPath = path.parse(filePath);

        this._parseOBJ(filePath);

        if (this._mtlLibs.length === 0) {
            AppContext.Get.addWarning('Could not find associated .mtl file');
        }
        for (let i = 0; i < this._mtlLibs.length; ++i) {
            const mtlLib = this._mtlLibs[i];
            if (!path.isAbsolute(mtlLib)) {
                this._mtlLibs[i] = path.join(this._objPath.dir, mtlLib);
            }
            ASSERT(path.isAbsolute(this._mtlLibs[i]));
        }

        this._parseMTL();

        LOG(this);
        return new Mesh(this._vertices, this._uvs, this._tris, this._materials);
    }

    private _parseOBJ(path: string) {
        if (!fs.existsSync(path)) {
            throw new CustomError(`Could not find ${path}`);
        }
        const fileContents = fs.readFileSync(path, 'utf8');
        if (fileContents.includes('�')) {
            throw new CustomError(`Unrecognised character found, please encode <b>${path}</b> using UTF-8`);
        }

        fileContents.replace('\r', ''); // Convert Windows carriage return
        const fileLines = fileContents.split('\n');

        for (const line of fileLines) {
            this._parseOBJLine(line);
        }
    }

    private _parseOBJLine(line: string) {
        const essentialTokens = ['mtllib ', 'uselib ', 'v ', 'vt ', 'f '];

        for (const parser of this._objParsers) {
            const match = parser.regex.exec(line);
            if (match && match.groups) {
                try {
                    parser.delegate(match.groups);
                } catch (error) {
                    if (error instanceof CustomError) {
                        throw new CustomError(`Failed attempt to parse '${line}', because '${error.message}'`);
                    }
                }
                return;
            }
        }

        const beginsWithEssentialToken = essentialTokens.some((token) => {
            return line.startsWith(token);
        });
        if (beginsWithEssentialToken) {
            throw new CustomError(`Failed to parse essential token for ${line}`);
        }
    }

    private _parseMTL() {
        for (const mtlLib of this._mtlLibs) {
            if (!fs.existsSync(mtlLib)) {
                throw new CustomError(`Could not find ${mtlLib}`);
            }
            const fileContents = fs.readFileSync(mtlLib, 'utf8');
    
            fileContents.replace('\r', ''); // Convert Windows carriage return
            const fileLines = fileContents.split('\n');
    
            for (const line of fileLines) {
                this._parseMTLLine(line);
            }

            this._addCurrentMaterial();
        }
    }

    private _parseMTLLine(line: string) {
        const essentialTokens = ['newmtl ', 'Kd ', 'map_Kd '];

        for (const parser of this._mtlParsers) {
            const match = parser.regex.exec(line);
            if (match && match.groups) {
                try {
                    parser.delegate(match.groups);
                } catch (error) {
                    if (error instanceof CustomError) {
                        throw new CustomError(`Failed attempt to parse '${line}', because '${error.message}'`);
                    }
                }
                return;
            }
        }

        const beginsWithEssentialToken = essentialTokens.some((token) => {
            return line.startsWith(token);
        });
        if (beginsWithEssentialToken) {
            throw new CustomError(`Failed to parse essential token for ${line}`);
        }
    }

    private _addCurrentMaterial() {
        if (this._materialReady && this._currentMaterialName !== '') {
            if (this._currentTexture !== '') {
                this._materials[this._currentMaterialName] = {
                    type: MaterialType.textured,
                    path: this._currentTexture,
                };
            } else {
                this._materials[this._currentMaterialName] = {
                    type: MaterialType.solid,
                    colour: this._currentColour,
                };
            }
        }
    }
}
