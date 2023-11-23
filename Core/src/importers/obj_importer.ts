import { OtS_Colours, RGBAUtil } from '../util/colour';
import { OtS_Mesh } from '../ots_mesh';
import { OtS_Texture } from '../ots_texture';
import { Triangle } from '../util/triangle';
import { Vector3 } from '../util/vector';
import { OtS_Importer } from './base_importer';
import { UV } from '../util/types';
import { ASSERT, OtS_Util } from '../util/util';

export type OtS_ObjImporterError =
    | { type: 'invalid-encoding' }
    | { type: 'invalid-material-name', name: string }
    | { type: 'invalid-data' }
    | { type: 'failed-to-parse', line: string }
    | { type: 'failed-to-parse-essential-token', line: string };

interface VertexIndices {
    v0: number;
    v1: number;
    v2: number;
}

export interface Tri {
    positionIndices: VertexIndices;
    normalIndices?: VertexIndices;
    texcoordIndices?: VertexIndices;
    material: string;
}

export class OtS_Importer_Obj extends OtS_Importer {
    private _vertices: Vector3[] = [];
    private _normals: Vector3[] = [];
    private _uvs: UV[] = [];
    private _tris: Tri[] = [];
    private _currentMaterialName: string = 'DEFAULT_UNASSIGNED';
    // Parser context
    private _linesToParse: string[] = [];

    private static _REGEX_USEMTL = new OtS_Util.Regex.RegExpBuilder()
        .add(/^usemtl/)
        .add(/ /)
        .add(OtS_Util.Regex.REGEX_NZ_ANY, 'name')
        .toRegExp();

    private static _REGEX_VERTEX = new OtS_Util.Regex.RegExpBuilder()
        .add(/^v/)
        .addNonzeroWhitespace()
        .add(OtS_Util.Regex.REGEX_NUMBER, 'x')
        .addNonzeroWhitespace()
        .add(OtS_Util.Regex.REGEX_NUMBER, 'y')
        .addNonzeroWhitespace()
        .add(OtS_Util.Regex.REGEX_NUMBER, 'z')
        .toRegExp();

    private static _REGEX_NORMAL = new OtS_Util.Regex.RegExpBuilder()
        .add(/^vn/)
        .addNonzeroWhitespace()
        .add(OtS_Util.Regex.REGEX_NUMBER, 'x')
        .addNonzeroWhitespace()
        .add(OtS_Util.Regex.REGEX_NUMBER, 'y')
        .addNonzeroWhitespace()
        .add(OtS_Util.Regex.REGEX_NUMBER, 'z')
        .toRegExp();

    private static _REGEX_TEXCOORD = new OtS_Util.Regex.RegExpBuilder()
        .add(/^vt/)
        .addNonzeroWhitespace()
        .add(OtS_Util.Regex.REGEX_NUMBER, 'u')
        .addNonzeroWhitespace()
        .add(OtS_Util.Regex.REGEX_NUMBER, 'v')
        .toRegExp();

    private static _REGEX_FACE = new OtS_Util.Regex.RegExpBuilder()
        .add(/^f/)
        .addNonzeroWhitespace()
        .add(/.*/, 'line')
        .toRegExp();

    private _consumeLoadedLines(includeLast: boolean) {
        const size = includeLast ? this._linesToParse.length : this._linesToParse.length - 1;

        for (let i = 0; i < size; ++i) {
            const line = this._linesToParse[i];
            const { err } = this.parseOBJLine(line);
            if (err !== null) {
                // TODO:
                //throw new ObjImporterError(err);
            }
        }

        this._linesToParse.splice(0, size);
    }

    public override async import(file: ReadableStream<Uint8Array>): Promise<OtS_Mesh> {
        const reader = file.getReader();
        const decoder = new TextDecoder(); //utf8

        let lastChunkEndedWithNewline = false;
        let result: ReadableStreamReadResult<Uint8Array>;
        do {
            result = await reader.read();
            const string = decoder.decode(result.value);

            const newLines = string.split(/\r?\n/);
            if (newLines.length > 0) {
                if (this._linesToParse.length === 0 || lastChunkEndedWithNewline) {
                    this._linesToParse = this._linesToParse.concat(newLines);
                } else {
                    const lastIndex = this._linesToParse.length - 1;
                    const last = this._linesToParse[lastIndex];
                    this._linesToParse[lastIndex] = last + newLines[0];
                    this._linesToParse = this._linesToParse.concat(newLines.slice(1));
                }
            }

            this._consumeLoadedLines(result.done);

            const lastChar = string[string.length - 1];
            lastChunkEndedWithNewline = lastChar === '\n' || lastChar === '\r\n';
        } while (!result.done);

        const materials = new Map<string, boolean>();
        this._tris.forEach((tri) => {
            if (!materials.has(tri.material)) {
                materials.set(tri.material, tri.texcoordIndices !== undefined);
            }
        });

        const mesh = OtS_Mesh.create();
        for (const [material, isTextureMaterial]  of materials) {
            if (isTextureMaterial) {
                const positionData: number[] = [];
                const normalData: number[] = [];
                const texcoordData: number[] = [];
                const indexData: number[] = [];
                let ni = 0;

                this._tris.forEach((tri) => {
                    if (tri.material === material) {
                        const p0 = this._vertices[tri.positionIndices.v0];
                        const p1 = this._vertices[tri.positionIndices.v1];
                        const p2 = this._vertices[tri.positionIndices.v2];

                        let n0: Vector3;
                        let n1: Vector3;
                        let n2: Vector3;
                        if (tri.normalIndices) {
                            n0 = this._normals[tri.normalIndices.v0];
                            n1 = this._normals[tri.normalIndices.v1];
                            n2 = this._normals[tri.normalIndices.v2];
                        } else {
                            n0 = Triangle.CalcNormal(p0, p1, p2);
                            n1 = n0.copy();
                            n2 = n0.copy();
                        }

                        ASSERT(tri.texcoordIndices !== undefined);
                        const t0 = this._uvs[tri.texcoordIndices.v0];
                        const t1 = this._uvs[tri.texcoordIndices.v1];
                        const t2 = this._uvs[tri.texcoordIndices.v2];

                        positionData.push(p0.x, p0.y, p0.z);
                        normalData.push(n0.x, n0.y, n0.z);
                        texcoordData.push(t0.u, t0.v);
                        indexData.push(ni++);
                        positionData.push(p1.x, p1.y, p1.z);
                        normalData.push(n1.x, n1.y, n1.z);
                        texcoordData.push(t1.u, t1.v);
                        indexData.push(ni++);
                        positionData.push(p2.x, p2.y, p2.z);
                        normalData.push(n2.x, n2.y, n2.z);
                        texcoordData.push(t2.u, t2.v);
                        indexData.push(ni++);
                    }
                });

                mesh.addSection({
                    name: material,
                    type: 'textured',
                    texture: OtS_Texture.CreateDebugTexture(),
                    positionData: Float32Array.from(positionData),
                    texcoordData: Float32Array.from(texcoordData),
                    normalData: Float32Array.from(normalData),
                    indexData: Uint32Array.from(indexData),
                });
            } else {
                const positionData: number[] = [];
                const normalData: number[] = [];
                const indexData: number[] = [];
                let ni = 0;

                this._tris.forEach((tri) => {
                    if (tri.material === material) {
                        const p0 = this._vertices[tri.positionIndices.v0];
                        const p1 = this._vertices[tri.positionIndices.v1];
                        const p2 = this._vertices[tri.positionIndices.v2];

                        let n0: Vector3;
                        let n1: Vector3;
                        let n2: Vector3;
                        if (tri.normalIndices) {
                            n0 = this._normals[tri.normalIndices.v0];
                            n1 = this._normals[tri.normalIndices.v1];
                            n2 = this._normals[tri.normalIndices.v2];
                        } else {
                            n0 = Triangle.CalcNormal(p0, p1, p2);
                            n1 = n0.copy();
                            n2 = n0.copy();
                        }

                        positionData.push(p0.x, p0.y, p0.z);
                        normalData.push(n0.x, n0.y, n0.z);
                        indexData.push(ni++);
                        positionData.push(p1.x, p1.y, p1.z);
                        normalData.push(n1.x, n1.y, n1.z);
                        indexData.push(ni++);
                        positionData.push(p2.x, p2.y, p2.z);
                        normalData.push(n2.x, n2.y, n2.z);
                        indexData.push(ni++);
                    }
                });

                mesh.addSection({
                    name: material,
                    type: 'solid',
                    colour: OtS_Colours.WHITE,
                    positionData: Float32Array.from(positionData),
                    normalData: Float32Array.from(normalData),
                    indexData: Uint32Array.from(indexData),
                });
            }
        }

        return mesh;
    }

    /**
     * Attempts to parse the given line of an OBJ file.
     * Potentially returns an error if failed to do so.
     */
    public parseOBJLine(line: string): { err: null | OtS_ObjImporterError } {
        false
            || this._tryParseAsUsemtl(line)
            || this._tryParseAsVertex(line)
            || this._tryParseAsNormal(line)
            || this._tryParseAsTexcoord(line)
            || this._tryParseAsFace(line);

        return { err: null };
    }

    // e.g. 'usemtl my_material'
    private _tryParseAsUsemtl(line: string): boolean {
        const match = OtS_Importer_Obj._REGEX_USEMTL.exec(line);
        if (match === null) {
            return false;
        }

        const materialName = match.groups?.name.trim();

        if (materialName === undefined || materialName.length === 0) {
            throw 'Invalid material name'; // TODO: Error type
        }

        this._currentMaterialName = materialName;
        return true;
    }

    // e.g. 'v 0.123 0.456 0.789'
    private _tryParseAsVertex(line: string): boolean {
        const match = OtS_Importer_Obj._REGEX_VERTEX.exec(line);
        if (match === null) {
            return false;
        }

        const x = parseFloat(match.groups?.x ?? '');
        const y = parseFloat(match.groups?.y ?? '');
        const z = parseFloat(match.groups?.z ?? '');

        if (isNaN(x) || isNaN(y) || isNaN(z)) {
            throw 'Invalid data'; // TODO: Error type
        }

        this._vertices.push(new Vector3(x, y, z));
        return true;
    }

    // e.g. 'vn 0.123 0.456 0.789'
    private _tryParseAsNormal(line: string): boolean {
        const match = OtS_Importer_Obj._REGEX_NORMAL.exec(line);
        if (match === null) {
            return false;
        }

        const x = parseFloat(match.groups?.x ?? '');
        const y = parseFloat(match.groups?.y ?? '');
        const z = parseFloat(match.groups?.z ?? '');

        if (isNaN(x) || isNaN(y) || isNaN(z)) {
            throw 'Invalid data'; // TODO: Error type
        }

        this._normals.push(new Vector3(x, y, z));
        return true;
    }

    // e.g. 'vt 0.123 0.456'
    private _tryParseAsTexcoord(line: string): boolean {
        const match = OtS_Importer_Obj._REGEX_TEXCOORD.exec(line);
        if (match === null) {
            return false;
        }

        const u = parseFloat(match.groups?.u ?? '');
        const v = parseFloat(match.groups?.v ?? '');

        if (isNaN(u) || isNaN(v)) {
            throw 'Invalid data';
        }

        this._uvs.push({ u: u, v: v });
        return true;
    }

    private _tryParseAsFace(line: string): boolean {
        const match = OtS_Importer_Obj._REGEX_FACE.exec(line);
        if (match === null) {
            return false;
        }

        const data = match.groups?.line.trim();
        if (data === undefined) {
            throw 'Invalid data';
        }

        const vertices = data.split(' ').filter((x) => {
            return x.length !== 0;
        });

        if (vertices.length < 3) {
            throw 'Invalid data';
        }

        const points: {
            positionIndex: number;
            normalIndex?: number;
            texcoordIndex?: number;
        }[] = [];

        for (const vertex of vertices) {
            const vertexData = vertex.split('/');
            switch (vertexData.length) {
                case 1: {
                    const index = parseInt(vertexData[0]);
                    points.push({
                        positionIndex: index,
                        normalIndex: index,
                        texcoordIndex: index,
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
                    });
                    break;
                }
                default:
                    throw 'Invalid data';
            }
        }

        const pointBase = points[0];
        for (let i = 1; i < points.length - 1; ++i) {
            const pointA = points[i];
            const pointB = points[i + 1];
            const tri: Tri = {
                positionIndices: {
                    v0: pointBase.positionIndex - 1,
                    v1: pointA.positionIndex - 1,
                    v2: pointB.positionIndex - 1,
                },
                material: this._currentMaterialName,
            };
            if (pointBase.normalIndex || pointA.normalIndex || pointB.normalIndex) {
                ASSERT(pointBase.normalIndex && pointA.normalIndex && pointB.normalIndex);
                tri.normalIndices = {
                    v0: pointBase.normalIndex - 1,
                    v1: pointA.normalIndex - 1,
                    v2: pointB.normalIndex - 1,
                };
            }
            if (pointBase.texcoordIndex || pointA.texcoordIndex || pointB.texcoordIndex) {
                ASSERT(pointBase.texcoordIndex && pointA.texcoordIndex && pointB.texcoordIndex);
                tri.texcoordIndices = {
                    v0: pointBase.texcoordIndex - 1,
                    v1: pointA.texcoordIndex - 1,
                    v2: pointB.texcoordIndex - 1,
                };
            }
            this._tris.push(tri);
        }

        return true;
    }
}
