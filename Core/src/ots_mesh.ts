import { Bounds } from './bounds';
import { RGBA } from './colour';
import { degreesToRadians } from './math';
import { OtS_MeshSection } from './ots_materials';
import { OtS_Texture } from './ots_texture';
import { UV } from "./util";
import { ASSERT } from './util/error_util';
import { Result } from './util/type_util';
import { Vector3 } from "./vector";

type OtS_VertexData<T> = {
    v0: T,
    v1: T,
    v2: T,
}

export type OtS_Triangle =
    | { type: 'solid', colour: RGBA, data: OtS_VertexData<{ position: Vector3, normal: Vector3 }> }
    | { type: 'coloured', data: OtS_VertexData<{ position: Vector3, normal: Vector3, colour: RGBA }> }
    | { type: 'textured', texture: OtS_Texture, data: OtS_VertexData<{ position: Vector3, normal: Vector3, texcoord: UV }> }

type OtS_MeshError = 'bad-height' | 'bad-material-match' | 'bad-geometry';

export type OtS_MeshSectionMetadata = { name: string } & (
    | { type: 'solid', colour: RGBA }
    | { type: 'colour' }
    | { type: 'textured', texture: OtS_Texture }
);

export class OtS_Mesh {
    private _sections: OtS_MeshSection[];

    private constructor() {
        this._sections = [];
    }

    public static create() {
        return new this();
        /*
        // TODO: Check non-zero height
        if (false) {
            return { ok: false, error: {
                code: 'bad-height',
                message: 'Geometry should have a non-zero height, consider rotating the mesh'
            }};
        }

        // TODO: Check geometry using materials slots is valid, i.e. a triangle that uses a
        // textured material must have texcoords
        if (false) {
            return { ok: false, error: {
                code: 'bad-material-match',
                message: 'Material \'x\' uses a textured material but has no texcoords'
            }};
        }

        // TODO: Check material slots used by geometry are defined

        if (!geometry.hasAttribute('position')) {
            return { ok: false, error: {
                code: 'bad-geometry',
                message: 'Missing position data'
            }};
        }

        const mesh = new this(geometry, materials);
        return { ok: true, value: mesh };
        */
    }

    public addSection(section: OtS_MeshSection): Result<void, OtS_MeshError> {
        // TODO: Validation

        // TODO: Ensure section names do not clash

        this._sections.push(section);
        return { ok: true, value: undefined };
    }

    public translate(x: number, y: number, z: number) {
        this._sections.forEach((section) => {
            for (let i = 0; i < section.positionData.length; i += 3) {
                section.positionData[i + 0] += x;
                section.positionData[i + 1] += y;
                section.positionData[i + 2] += z;
            }
        });
    }

    public scale(s: number) {
        this._sections.forEach((section) => {
            for (let i = 0; i < section.positionData.length; i += 3) {
                section.positionData[i + 0] *= s;
                section.positionData[i + 1] *= s;
                section.positionData[i + 2] *= s;
            }
        });
    }

    public centre() {
        const centre = this.calcBounds().getCentre();
        this.translate(-centre.x, -centre.y, -centre.z);
    }

    public normalise(): boolean {
        const bounds = this.calcBounds();
        const size = Vector3.sub(bounds.max, bounds.min);
        const scaleFactor = 1.0 / size.y;

        if (isNaN(scaleFactor) || !isFinite(scaleFactor)) {
            return false;
        }

        this.scale(scaleFactor);
        return true;
    }

    public rotate(pitch: number, roll: number, yaw: number) {
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

        this._sections.forEach((section) => {
            for (let i = 0; i < section.positionData.length; i += 3) {
                const px = section.positionData[i + 0];
                const py = section.positionData[i + 1];
                const pz = section.positionData[i + 2];
    
                section.positionData[i + 0] = Axx * px + Axy * py + Axz * pz;
                section.positionData[i + 1] = Ayx * px + Ayy * py + Ayz * pz;
                section.positionData[i + 2] = Azx * px + Azy * py + Azz * pz;
            }
        });
    }

    /**
     * @note Returns a reference to the underlying materials, modifying these is dangerous
     */
    public getTriangles(): IterableIterator<OtS_Triangle> {
        const sectionCount = this._sections.length;
        ASSERT(sectionCount > 0); // TODO: Don't assert,
        
        let sectionIndex = 0;
        let triangleCount = this._sections[0].positionData.length / 3;
        let triangleIndex = 0;

        return {
            [Symbol.iterator]: function () {
                return this;
            },
            next: () => {
                if (triangleIndex >= triangleCount && sectionIndex < sectionCount) {
                    ++sectionIndex;
                    triangleCount = this._sections[sectionIndex].positionData.length / 3;
                }

                if (triangleIndex < triangleCount) {
                    const section = this._sections[sectionIndex];

                    const index0 = section.indexData[triangleIndex * 3 + 0];
                    const index1 = section.indexData[triangleIndex * 3 + 1];
                    const index2 = section.indexData[triangleIndex * 3 + 2];

                    ++triangleIndex;

                    switch (section.type) {
                        case 'solid': {
                            const triangle: OtS_Triangle = {
                                type: 'solid',
                                colour: section.colour,
                                data: {
                                    v0: {
                                        position: new Vector3(
                                            section.positionData[index0 * 3 + 0],
                                            section.positionData[index0 * 3 + 1],
                                            section.positionData[index0 * 3 + 2],
                                        ),
                                        normal: new Vector3(
                                            section.normalData[index0 * 3 + 0],
                                            section.normalData[index0 * 3 + 1],
                                            section.normalData[index0 * 3 + 2],
                                        ),
                                    },
                                    v1: {
                                        position: new Vector3(
                                            section.positionData[index1 * 3 + 0],
                                            section.positionData[index1 * 3 + 1],
                                            section.positionData[index1 * 3 + 2],
                                        ),
                                        normal: new Vector3(
                                            section.normalData[index1 * 3 + 0],
                                            section.normalData[index1 * 3 + 1],
                                            section.normalData[index1 * 3 + 2],
                                        ),
                                    },
                                    v2: {
                                        position: new Vector3(
                                            section.positionData[index2 * 3 + 0],
                                            section.positionData[index2 * 3 + 1],
                                            section.positionData[index2 * 3 + 2],
                                        ),
                                        normal: new Vector3(
                                            section.normalData[index2 * 3 + 0],
                                            section.normalData[index2 * 3 + 1],
                                            section.normalData[index2 * 3 + 2],
                                        ),
                                    },
                                },
                            }
                            return { done: false, value: triangle };
                        }
                        case 'colour': {
                            const triangle: OtS_Triangle = {
                                type: 'coloured',
                                data: {
                                    v0: {
                                        position: new Vector3(
                                            section.positionData[index0 * 3 + 0],
                                            section.positionData[index0 * 3 + 1],
                                            section.positionData[index0 * 3 + 2],
                                        ),
                                        normal: new Vector3(
                                            section.normalData[index0 * 3 + 0],
                                            section.normalData[index0 * 3 + 1],
                                            section.normalData[index0 * 3 + 2],
                                        ),
                                        colour: {
                                            r: section.colourData[index0 * 4 + 0],
                                            g: section.colourData[index0 * 4 + 1],
                                            b: section.colourData[index0 * 4 + 2],
                                            a: section.colourData[index0 * 4 + 3],
                                        },
                                    },
                                    v1: {
                                        position: new Vector3(
                                            section.positionData[index1 * 3 + 0],
                                            section.positionData[index1 * 3 + 1],
                                            section.positionData[index1 * 3 + 2],
                                        ),
                                        normal: new Vector3(
                                            section.normalData[index1 * 3 + 0],
                                            section.normalData[index1 * 3 + 1],
                                            section.normalData[index1 * 3 + 2],
                                        ),
                                        colour: {
                                            r: section.colourData[index1 * 4 + 0],
                                            g: section.colourData[index1 * 4 + 1],
                                            b: section.colourData[index1 * 4 + 2],
                                            a: section.colourData[index1 * 4 + 3],
                                        },
                                    },
                                    v2: {
                                        position: new Vector3(
                                            section.positionData[index2 * 3 + 0],
                                            section.positionData[index2 * 3 + 1],
                                            section.positionData[index2 * 3 + 2],
                                        ),
                                        normal: new Vector3(
                                            section.normalData[index2 * 3 + 0],
                                            section.normalData[index2 * 3 + 1],
                                            section.normalData[index2 * 3 + 2],
                                        ),
                                        colour: {
                                            r: section.colourData[index2 * 4 + 0],
                                            g: section.colourData[index2 * 4 + 1],
                                            b: section.colourData[index2 * 4 + 2],
                                            a: section.colourData[index2 * 4 + 3],
                                        },
                                    },
                                },
                            }
                            return { done: false, value: triangle };
                        }
                        case 'textured': {
                            const triangle: OtS_Triangle = {
                                type: 'textured',
                                texture: section.texture,
                                data: {
                                    v0: {
                                        position: new Vector3(
                                            section.positionData[index0 * 3 + 0],
                                            section.positionData[index0 * 3 + 1],
                                            section.positionData[index0 * 3 + 2],
                                        ),
                                        normal: new Vector3(
                                            section.normalData[index0 * 3 + 0],
                                            section.normalData[index0 * 3 + 1],
                                            section.normalData[index0 * 3 + 2],
                                        ),
                                        texcoord: {
                                            u: section.texcoordData[index0 * 2 + 0],
                                            v: section.texcoordData[index0 * 2 + 1],
                                        },
                                    },
                                    v1: {
                                        position: new Vector3(
                                            section.positionData[index1 * 3 + 0],
                                            section.positionData[index1 * 3 + 1],
                                            section.positionData[index1 * 3 + 2],
                                        ),
                                        normal: new Vector3(
                                            section.normalData[index1 * 3 + 0],
                                            section.normalData[index1 * 3 + 1],
                                            section.normalData[index1 * 3 + 2],
                                        ),
                                        texcoord: {
                                            u: section.texcoordData[index1 * 2 + 0],
                                            v: section.texcoordData[index1 * 2 + 1],
                                        },
                                    },
                                    v2: {
                                        position: new Vector3(
                                            section.positionData[index2 * 3 + 0],
                                            section.positionData[index2 * 3 + 1],
                                            section.positionData[index2 * 3 + 2],
                                        ),
                                        normal: new Vector3(
                                            section.normalData[index2 * 3 + 0],
                                            section.normalData[index2 * 3 + 1],
                                            section.normalData[index2 * 3 + 2],
                                        ),
                                        texcoord: {
                                            u: section.texcoordData[index2 * 2 + 0],
                                            v: section.texcoordData[index2 * 2 + 1],
                                        },
                                    },
                                },
                            }
                            return { done: false, value: triangle };
                        }
                    }
                }

                return { done: true, value: undefined };
            },
        };
    }

    public copy() {
        const clone = OtS_Mesh.create();

        for (const section of this._sections) {
            const success = clone.addSection(section).ok;
            ASSERT(success);
        }

        return clone;
    }

    public calcBounds() {
        const bounds = Bounds.getEmptyBounds();
        
        const vec = new Vector3(0, 0, 0);
        this._sections.forEach((section) => {
            for (let i = 0; i < section.positionData.length; i += 3) {
                vec.set(
                    section.positionData[i + 0],
                    section.positionData[i + 1],
                    section.positionData[i + 2],
                );
                bounds.extendByPoint(vec);
            }
        });

        return bounds;
    }

    public calcTriangleCount() {
        return this._sections
            .map((section) => {
                return section.indexData.length / 3;
            })
            .reduce((total, count) => total + count, 0);
    }

    // TODO: Return copy
    public getSectionData(): OtS_MeshSection[] {
        return this._sections;
    }

    public getSectionMetadata(): OtS_MeshSectionMetadata[] {
        const metadata: OtS_MeshSectionMetadata[] = [];

        this._sections.forEach((section) => {
            let entry: OtS_MeshSectionMetadata;
            switch (section.type) {
                case 'solid':
                    entry = {
                        type: 'solid',
                        name: section.name,
                        colour: section.colour,
                    };
                    break;
                case 'colour': {
                    entry = {
                        type: 'colour',
                        name: section.name,
                    };
                    break;
                }
                case 'textured':
                    entry = {
                        type: 'textured',
                        name: section.name,
                        texture: section.texture,
                    }
            }
            metadata.push(entry);
        });

        return metadata;
    }
}