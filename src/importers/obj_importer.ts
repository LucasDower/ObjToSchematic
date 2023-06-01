import { LOC } from '../localiser';
import { checkNaN } from '../math';
import { Mesh, Tri } from '../mesh';
import { UV } from '../util';
import { AppError, ASSERT } from '../util/error_util';
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
    private _currentMaterialName: string = 'DEFAULT_UNASSIGNED';

    private _objParsers = [
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
                            throw new AppError(LOC('import.invalid_face_data', { count: vertexData.length}));
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

    public override import(file: File): Promise<Mesh> {
        return file.text().then((fileSource) => {
            if (fileSource.includes('�')) {
                throw new AppError(LOC('import.invalid_encoding'));
            }

            fileSource.replace('\r', ''); // Convert Windows carriage return
            const fileLines = fileSource.split('\n');

            for (const line of fileLines) {
                this.parseOBJLine(line);
            }

            return new Mesh(this._vertices, this._normals, this._uvs, this._tris, new Map());
        });
    }
    public parseOBJLine(line: string) {
        const essentialTokens = ['usemtl ', 'v ', 'vt ', 'f ', 'vn '];

        for (const parser of this._objParsers) {
            const match = parser.regex.exec(line);
            if (match && match.groups) {
                try {
                    parser.delegate(match.groups);
                } catch (error) {
                    if (error instanceof AppError) {
                        throw new AppError(LOC('import.failed_to_parse_line', { line: line, error: error.message }));
                    }
                }
                return;
            }
        }

        const beginsWithEssentialToken = essentialTokens.some((token) => {
            return line.startsWith(token);
        });
        if (beginsWithEssentialToken) {
            ASSERT(false, `Failed to parse essential token for <b>${line}</b>`);
        }
    }
}
