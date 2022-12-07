import fs from 'fs';
import path from 'path';

import { RGBA, RGBAColours } from '../colour';
import { checkFractional, checkNaN } from '../math';
import { MaterialType, Mesh, SolidMaterial, TexturedMaterial, Tri } from '../mesh';
import { StatusHandler } from '../status';
import { UV } from '../util';
import { AppError, ASSERT } from '../util/error_util';
import { LOG } from '../util/log_util';
import { LOG_ERROR } from '../util/log_util';
import { RegExpBuilder } from '../util/regex_util';
import { REGEX_NZ_ANY } from '../util/regex_util';
import { REGEX_NUMBER } from '../util/regex_util';
import { Vector3 } from '../vector';
import { IImporter } from './base_importer';

export class ObjImporter extends IImporter {
    private _vertices: Vector3[] = [];
    private _normals: Vector3[] = [];
    private _uvs: UV[] = [];
    private _tris: Tri[] = [];

    private _materials: { [key: string]: (SolidMaterial | TexturedMaterial) } = {
        'DEFAULT_UNASSIGNED': { type: MaterialType.solid, colour: RGBAColours.WHITE, edited: true, canBeTextured: false, set: true, open: false },
    };
    private _mtlLibs: string[] = [];
    private _currentMaterialName: string = 'DEFAULT_UNASSIGNED';

    private _objPath?: path.ParsedPath;
    private _objParsers = [
        {
            // e.g. 'mtllib my_file.mtl'
            regex: new RegExpBuilder().add(/^mtllib/).add(/ /).add(REGEX_NZ_ANY, 'path').toRegExp(),
            delegate: (match: { [key: string]: string }) => {
                this._mtlLibs.push(match.path.trim());
            },
        },
        {
            // e.g. 'usemtl my_material'
            regex: new RegExpBuilder().add(/^usemtl/).add(/ /).add(REGEX_NZ_ANY, 'name').toRegExp(),
            delegate: (match: { [key: string]: string }) => {
                this._currentMaterialName = match.name.trim();
                ASSERT(this._currentMaterialName, 'invalid material name');
            },
        },
        {
            // e.g. 'v 0.123 0.456 0.789'
            regex: new RegExpBuilder()
                .add(/^v/)
                .addNonzeroWhitespace()
                .add(REGEX_NUMBER, 'x')
                .addNonzeroWhitespace()
                .add(REGEX_NUMBER, 'y')
                .addNonzeroWhitespace()
                .add(REGEX_NUMBER, 'z')
                .toRegExp(),
            delegate: (match: { [key: string]: string }) => {
                const x = parseFloat(match.x);
                const y = parseFloat(match.y);
                const z = parseFloat(match.z);
                checkNaN(x, y, z);
                this._vertices.push(new Vector3(x, y, z));
            },
        },
        {
            // e.g. 'vn 0.123 0.456 0.789'
            regex: new RegExpBuilder()
                .add(/^vn/)
                .addNonzeroWhitespace()
                .add(REGEX_NUMBER, 'x')
                .addNonzeroWhitespace()
                .add(REGEX_NUMBER, 'y')
                .addNonzeroWhitespace()
                .add(REGEX_NUMBER, 'z')
                .toRegExp(),
            delegate: (match: { [key: string]: string }) => {
                const x = parseFloat(match.x);
                const y = parseFloat(match.y);
                const z = parseFloat(match.z);
                checkNaN(x, y, z);
                this._normals.push(new Vector3(x, y, z));
            },
        },
        {
            // e.g. 'vt 0.123 0.456'
            regex: new RegExpBuilder()
                .add(/^vt/)
                .addNonzeroWhitespace()
                .add(REGEX_NUMBER, 'u')
                .addNonzeroWhitespace()
                .add(REGEX_NUMBER, 'v')
                .toRegExp(),
            delegate: (match: { [key: string]: string }) => {
                const u = parseFloat(match.u);
                const v = parseFloat(match.v);
                checkNaN(u, v);
                this._uvs.push(new UV(u, v));
            },
        },
        {
            // e.g. 'f 1/2/3 ...' or 'f 1/2 ...' or 'f 1 ...'
            regex: new RegExpBuilder()
                .add(/^f/)
                .addNonzeroWhitespace()
                .add(/.*/, 'line')
                .toRegExp(),
            delegate: (match: { [key: string]: string }) => {
                const line = match.line.trim();

                const vertices = line.split(' ').filter((x) => {
                    return x.length !== 0;
                });

                if (vertices.length < 3) {
                    // this.addWarning('')
                    // throw new AppError('Face data should have at least 3 vertices');
                }

                const points: {
                    positionIndex: number;
                    texcoordIndex?: number;
                    normalIndex?: number;
                }[] = [];

                for (const vertex of vertices) {
                    const vertexData = vertex.split('/');
                    switch (vertexData.length) {
                        case 1: {
                            const index = parseInt(vertexData[0]);
                            points.push({
                                positionIndex: index,
                                texcoordIndex: index,
                                normalIndex: index,
                            });
                            break;
                        }
                        case 2: {
                            const positionIndex = parseInt(vertexData[0]);
                            const texcoordIndex = parseInt(vertexData[1]);
                            points.push({
                                positionIndex: positionIndex,
                                texcoordIndex: texcoordIndex,
                            });
                            break;
                        }
                        case 3: {
                            const positionIndex = parseInt(vertexData[0]);
                            const texcoordIndex = parseInt(vertexData[1]);
                            const normalIndex = parseInt(vertexData[2]);
                            points.push({
                                positionIndex: positionIndex,
                                texcoordIndex: texcoordIndex,
                                normalIndex: normalIndex,
                            });
                            break;
                        }
                        default:
                            throw new AppError(`Face data has unexpected number of vertex data: ${vertexData.length}`);
                    }
                }

                const pointBase = points[0];
                for (let i = 1; i < points.length - 1; ++i) {
                    const pointA = points[i];
                    const pointB = points[i + 1];
                    const tri: Tri = {
                        positionIndices: {
                            x: pointBase.positionIndex - 1,
                            y: pointA.positionIndex - 1,
                            z: pointB.positionIndex - 1,
                        },
                        material: this._currentMaterialName,
                    };
                    if (pointBase.normalIndex || pointA.normalIndex || pointB.normalIndex) {
                        ASSERT(pointBase.normalIndex && pointA.normalIndex && pointB.normalIndex);
                        tri.normalIndices = {
                            x: pointBase.normalIndex - 1,
                            y: pointA.normalIndex - 1,
                            z: pointB.normalIndex - 1,
                        };
                    }
                    if (pointBase.texcoordIndex || pointA.texcoordIndex || pointB.texcoordIndex) {
                        ASSERT(pointBase.texcoordIndex && pointA.texcoordIndex && pointB.texcoordIndex);
                        tri.texcoordIndices = {
                            x: pointBase.texcoordIndex - 1,
                            y: pointA.texcoordIndex - 1,
                            z: pointB.texcoordIndex - 1,
                        };
                    }
                    this._tris.push(tri);
                }
            },
        },
    ];

    private _currentColour: RGBA = RGBAColours.BLACK;
    private _currentAlpha: number = 1.0;
    private _currentTexture: string = '';
    private _currentTransparencyTexture: string = '';
    private _materialReady: boolean = false;
    private _mtlParsers = [
        {
            // e.g. 'newmtl my_material'
            regex: new RegExpBuilder().add(/^newmtl/).add(REGEX_NZ_ANY, 'name').toRegExp(),
            delegate: (match: { [key: string]: string }) => {
                this._addCurrentMaterial();
                this._currentMaterialName = match.name.trim();
                this._currentTexture = '';
                this._materialReady = false;
            },
        },
        {
            // e.g. 'Kd 0.123 0.456 0.789'
            regex: new RegExpBuilder()
                .add(/^Kd/)
                .addNonzeroWhitespace()
                .add(REGEX_NUMBER, 'r')
                .addNonzeroWhitespace()
                .add(REGEX_NUMBER, 'g')
                .addNonzeroWhitespace()
                .add(REGEX_NUMBER, 'b')
                .toRegExp(),
            delegate: (match: { [key: string]: string }) => {
                const r = parseFloat(match.r);
                const g = parseFloat(match.g);
                const b = parseFloat(match.b);
                checkNaN(r, g, b);
                checkFractional(r, g, b);
                this._currentColour = { r: r, g: g, b: b, a: this._currentAlpha };
                this._materialReady = true;
            },
        },
        {
            // e.g. 'map_Kd my/path/to/file.png'
            regex: new RegExpBuilder().add(/^map_Kd/).add(REGEX_NZ_ANY, 'path').toRegExp(),
            delegate: (match: { [key: string]: string }) => {
                let mtlPath = match.path.trim();
                if (!path.isAbsolute(mtlPath)) {
                    ASSERT(this._objPath, 'no obj path');
                    mtlPath = path.join(this._objPath.dir, mtlPath);
                }
                this._currentTexture = mtlPath;
                this._materialReady = true;
            },
        },
        {
            // Transparency map
            // e.g. 'map_d my/path/to/file.png'
            regex: new RegExpBuilder().add(/^map_d/).add(REGEX_NZ_ANY, 'path').toRegExp(),
            delegate: (match: { [key: string]: string }) => {
                let texturePath = match.path.trim();
                if (!path.isAbsolute(texturePath)) {
                    ASSERT(this._objPath, 'no obj path');
                    texturePath = path.join(this._objPath.dir, texturePath);
                }
                this._currentTransparencyTexture = texturePath;
                this._materialReady = true;
            },
        },
        {
            // Transparency value
            // e.g. 'd 0.7500'
            regex: new RegExpBuilder()
                .add(/^d/)
                .addNonzeroWhitespace()
                .add(REGEX_NUMBER, 'alpha')
                .toRegExp(),
            delegate: (match: { [key: string]: string }) => {
                const alpha = parseFloat(match.alpha);
                checkNaN(alpha);
                checkFractional(alpha);
                this._currentAlpha = alpha;
            },
        },
    ];

    override parseFile(filePath: string) {
        ASSERT(path.isAbsolute(filePath), `ObjImporter: ${filePath} not absolute`);

        this._objPath = path.parse(filePath);

        this._parseOBJ(filePath);

        if (this._mtlLibs.length === 0) {
            StatusHandler.Get.add('warning', 'Could not find associated .mtl file');
        }
        for (let i = 0; i < this._mtlLibs.length; ++i) {
            const mtlLib = this._mtlLibs[i];
            if (!path.isAbsolute(mtlLib)) {
                this._mtlLibs[i] = path.join(this._objPath.dir, mtlLib);
            }
            ASSERT(path.isAbsolute(this._mtlLibs[i]), 'path not absolute');
        }

        this._parseMTL();
        LOG('Materials', this._materials);
    }

    override toMesh(): Mesh {
        return new Mesh(this._vertices, this._normals, this._uvs, this._tris, this._materials);
    }

    private _parseOBJ(path: string) {
        if (!fs.existsSync(path)) {
            throw new AppError(`Could not find ${path}`);
        }
        const fileContents = fs.readFileSync(path, 'utf8');
        if (fileContents.includes('�')) {
            throw new AppError(`Unrecognised character found, please encode <b>${path}</b> using UTF-8`);
        }

        fileContents.replace('\r', ''); // Convert Windows carriage return
        const fileLines = fileContents.split('\n');

        for (const line of fileLines) {
            this.parseOBJLine(line);
        }
    }

    public parseOBJLine(line: string) {
        const essentialTokens = ['mtllib ', 'usemtl ', 'v ', 'vt ', 'f ', 'vn '];

        for (const parser of this._objParsers) {
            const match = parser.regex.exec(line);
            if (match && match.groups) {
                try {
                    parser.delegate(match.groups);
                } catch (error) {
                    LOG_ERROR('Caught', error);
                    if (error instanceof AppError) {
                        throw new AppError(`Failed attempt to parse '${line}', because '${error.message}'`);
                    }
                }
                return;
            }
        }

        const beginsWithEssentialToken = essentialTokens.some((token) => {
            return line.startsWith(token);
        });
        if (beginsWithEssentialToken) {
            throw new AppError(`Failed to parse essential token for <b>${line}</b>`);
        }
    }

    private _parseMTL() {
        for (const mtlLib of this._mtlLibs) {
            if (!fs.existsSync(mtlLib)) {
                StatusHandler.Get.add('warning', `Could not find ${mtlLib}`);
                continue;
            }
            const fileContents = fs.readFileSync(mtlLib, 'utf8');

            fileContents.replace('\r', ''); // Convert Windows carriage return
            const fileLines = fileContents.split('\n');

            for (const line of fileLines) {
                this._parseMTLLine(line.trim());
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
                    if (error instanceof AppError) {
                        throw new AppError(`Failed attempt to parse '${line}', because '${error.message}'`);
                    }
                }
                return;
            }
        }

        const beginsWithEssentialToken = essentialTokens.some((token) => {
            return line.startsWith(token);
        });
        if (beginsWithEssentialToken) {
            throw new AppError(`Failed to parse essential token for ${line}`);
        }
    }

    private _addCurrentMaterial() {
        if (this._materialReady && this._currentMaterialName !== '') {
            if (this._currentTexture !== '') {
                this._materials[this._currentMaterialName] = {
                    type: MaterialType.textured,
                    path: this._currentTexture,
                    alphaPath: this._currentTransparencyTexture === '' ? undefined : this._currentTransparencyTexture,
                    alphaFactor: this._currentAlpha,
                    edited: false,
                    canBeTextured: true,
                    extension: 'repeat',
                    interpolation: 'linear',
                    open: false,
                };
                this._currentTransparencyTexture = '';
            } else {
                this._materials[this._currentMaterialName] = {
                    type: MaterialType.solid,
                    colour: {
                        r: this._currentColour.r,
                        g: this._currentColour.g,
                        b: this._currentColour.b,
                        a: this._currentAlpha,
                    },
                    edited: false,
                    canBeTextured: false,
                    set: true,
                    open: false,
                };
            }
            this._currentAlpha = 1.0;
        }
    }
}
