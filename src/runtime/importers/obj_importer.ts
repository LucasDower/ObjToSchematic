import { anyNaN } from '../math';
import { Mesh, Tri } from '../mesh';
import { UV } from '../util';
import { ASSERT } from '../util/error_util';
import { RegExpBuilder } from '../util/regex_util';
import { REGEX_NZ_ANY } from '../util/regex_util';
import { REGEX_NUMBER } from '../util/regex_util';
import { Vector3 } from '../vector';
import { IImporter } from './base_importer';

type TObjImporterParser = {
    regex: RegExp,
    delegate: (match: { [key: string]: string }) => (null | TObjImporterError),
}

export type TObjImporterError =
    | { type: 'invalid-encoding' }
    | { type: 'invalid-material-name', name: string }
    | { type: 'invalid-data' }
    | { type: 'failed-to-parse', line: string }
    | { type: 'failed-to-parse-essential-token', line: string }

export class ObjImporterError extends Error {
    public error: TObjImporterError;

    constructor(error: TObjImporterError) {
        super();
        this.error = error;
    }
}

export class ObjImporter extends IImporter {
    private _vertices: Vector3[] = [];
    private _normals: Vector3[] = [];
    private _uvs: UV[] = [];
    private _tris: Tri[] = [];
    private _currentMaterialName: string = 'DEFAULT_UNASSIGNED';

    private _objParsers: TObjImporterParser[] = [
        {
            // e.g. 'usemtl my_material'
            regex: new RegExpBuilder().add(/^usemtl/).add(/ /).add(REGEX_NZ_ANY, 'name').toRegExp(),
            delegate: (match: { [key: string]: string }) => {
                this._currentMaterialName = match.name.trim();

                if (this._currentMaterialName.length === 0) {
                    const err: TObjImporterError = { type: 'invalid-material-name', name: match.name };
                    return err;
                }

                return null;
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

                if (anyNaN(x, y, z)) {
                    const err: TObjImporterError = { type: 'invalid-data' };
                    return err;
                }

                this._vertices.push(new Vector3(x, y, z));
                return null;
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

                if (anyNaN(x, y, z)) {
                    const err: TObjImporterError = { type: 'invalid-data' };
                    return err;
                }

                this._normals.push(new Vector3(x, y, z));
                return null;
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

                if (anyNaN(u, v)) {
                    const err: TObjImporterError = { type: 'invalid-data' };
                    return err;
                }

                this._uvs.push({ u: u, v: v });
                return null;
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
                    const err: TObjImporterError = { type: 'invalid-data' };
                    return err;
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
                            const err: TObjImporterError = { type: 'invalid-data' };
                            return err;
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

                return null;
            },
        },
    ];

    public override async import(file: File): Promise<Mesh> {
        const fileSource = await file.text();

        if (fileSource.includes('�')) {
            throw new ObjImporterError({ type: 'invalid-encoding' });
        }

        const fileLines = fileSource.split(/\r?\n/);
        const numLines = fileLines.length;

        // TODO: ProgressRework
        //const progressHandle = ProgressManager.Get.start('VoxelMeshBuffer');
        fileLines.forEach((line, index) => {
            const { err } = this.parseOBJLine(line);
            if (err !== null) {
                throw new ObjImporterError(err);
            }
            //ProgressManager.Get.progress(progressHandle, index / numLines);
        });
        // BUG: Maybe end the progress??? Regression?

        return new Mesh(this._vertices, this._normals, this._uvs, this._tris, new Map());
    }

    /**
     * Attempts to parse the given line of an OBJ file.
     * Potentially returns an error if failed to do so.
     */
    public parseOBJLine(line: string): { err: null | TObjImporterError} {
        const essentialTokens = ['usemtl ', 'v ', 'vt ', 'f ', 'vn '];

        for (const parser of this._objParsers) {
            const match = parser.regex.exec(line);
            if (match && match.groups) {
                const err = parser.delegate(match.groups);
                return { err: err };
            }
        }

        const beginsWithEssentialToken = essentialTokens.some((token) => {
            return line.startsWith(token);
        });

        if (beginsWithEssentialToken) {
            return { err: { type: 'failed-to-parse-essential-token', line: line } }
        }

        return { err: null };
    }
}
