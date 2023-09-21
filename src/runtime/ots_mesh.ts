import { Bounds } from './bounds';
import { RGBAColours, RGBAUtil } from './colour';
import { Material, OtS_Util, SolidMaterial } from './materials';
import { degreesToRadians } from './math';
import { UV } from "./util";
import { Vector3 } from "./vector";

// TODO: Nuke
interface VertexIndices {
    x: number;
    y: number;
    z: number;
}

// TODO: Nuke
export interface Tri {
    positionIndices: VertexIndices;
    texcoordIndices?: VertexIndices;
    normalIndices?: VertexIndices;
    material: string;
}

export type OtS_Vertex = {
    position: Vector3,
    texcoord: UV,
};

export type OtS_Triangle = {
    v0: OtS_Vertex,
    v1: OtS_Vertex,
    v2: OtS_Vertex,
    material: Material,
};

export class OtS_Mesh {
    private _materials: Material[];
    // [p0, p1, p2]
    private _positionData: Float32Array;
    private static _POSITION_STRIDE = 3;
    // [u, v]
    private _texcoordData: Float32Array;
    private static _TEXCOORD_STRIDE = 2;
    // [position_index * 3, texcoord_index * 3, material_index]
    private _triangleData: Uint32Array;
    private static _TRIANGLE_STRIDE = 7;

    public constructor(positionData: Float32Array, texcoordData: Float32Array, triangleData: Uint32Array, materials: Material[]) {
        this._materials = materials;
        this._positionData = positionData;
        this._texcoordData = texcoordData;
        this._triangleData = triangleData;
    }

    public translate(x: number, y: number, z: number) {
        for (let i = 0; i < this._positionData.length; i += 3) {
            this._positionData[i + 0] += x;
            this._positionData[i + 1] += y;
            this._positionData[i + 2] += z;
        }
    }

    public scale(s: number) {
        for (let i = 0; i < this._positionData.length; i += 3) {
            this._positionData[i + 0] *= s;
            this._positionData[i + 1] *= s;
            this._positionData[i + 2] *= s;
        }
    }

    public centre() {
        const centre = this.calcBounds().getCentre();
        this.translate(-centre.x, -centre.y, -centre.z);
    }

    public normalise() {
        const bounds = this.calcBounds();
        const size = Vector3.sub(bounds.max, bounds.min);
        const scaleFactor = 1.0 / size.y;

        if (isNaN(scaleFactor) || !isFinite(scaleFactor)) {
            throw 'Could not normalize';
        }

        this.scale(scaleFactor);
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

        for (let i = 0; i < this._positionData.length; i += 3) {
            const px = this._positionData[i + 0];
            const py = this._positionData[i + 1];
            const pz = this._positionData[i + 2];

            this._positionData[i + 0] = Axx * px + Axy * py + Axz * pz;
            this._positionData[i + 1] = Ayx * px + Ayy * py + Ayz * pz;
            this._positionData[i + 2] = Azx * px + Azy * py + Azz * pz;
        }
    }

    public setMaterial(newMaterial: Material): boolean {
        for (let i = 0; i < this._materials.length; ++i) {
            const oldMaterial = this._materials[i];
            if (oldMaterial.name === newMaterial.name) {
                if (oldMaterial.type === 'solid' && newMaterial.type === 'textured' && !oldMaterial.canBeTextured) {
                    return false; // Assigning a texture material to a non-textureable material
                }

                // TODO: Check newMaterial is valid

                this._materials[i] = newMaterial;
                return true;
            }
        }

        return false; // No material found under that name
    }

    public getTriangles(): IterableIterator<OtS_Triangle> {
        const triangleCount = this._triangleData.length / OtS_Mesh._TRIANGLE_STRIDE;
        let triangleIndex = 0;

        const getVertex = (positionIndex: number, texcoordIndex: number) => {
            return {
                position: new Vector3(
                    this._positionData[positionIndex * OtS_Mesh._POSITION_STRIDE + 0],
                    this._positionData[positionIndex * OtS_Mesh._POSITION_STRIDE + 1],
                    this._positionData[positionIndex * OtS_Mesh._POSITION_STRIDE + 2],
                ),
                texcoord: {
                    u: this._texcoordData[texcoordIndex * OtS_Mesh._TEXCOORD_STRIDE + 0],
                    v: this._texcoordData[texcoordIndex * OtS_Mesh._TEXCOORD_STRIDE + 1],
                },
            }
        }

        return {
            [Symbol.iterator]: function () {
                return this;
            },
            next: () => {
                if (triangleIndex < triangleCount) {
                    const dataIndex = triangleIndex * OtS_Mesh._TRIANGLE_STRIDE;

                    const positionIndex0 = this._triangleData[dataIndex + 0];
                    const positionIndex1 = this._triangleData[dataIndex + 1];
                    const positionIndex2 = this._triangleData[dataIndex + 2];
                    const texcoordIndex0 = this._triangleData[dataIndex + 3];
                    const texcoordIndex1 = this._triangleData[dataIndex + 4];
                    const texcoordIndex2 = this._triangleData[dataIndex + 5];
                    const materialIndex = this._triangleData[dataIndex + 6];

                    const triangle: OtS_Triangle = {
                        material: this._materials[materialIndex],
                        v0: getVertex(positionIndex0, texcoordIndex0),
                        v1: getVertex(positionIndex1, texcoordIndex1),
                        v2: getVertex(positionIndex2, texcoordIndex2),
                    };

                    ++triangleIndex;

                    return { done: false, value: triangle };
                } else {
                    return { done: true, value: undefined };
                }
            },
        };
    }

    public copy() {
        return new OtS_Mesh(
            this._positionData.slice(0),
            this._texcoordData.slice(0),
            this._triangleData.slice(0),
            this._materials.map((material) => {
                return OtS_Util.copyMaterial(material);
            }),
        );
    }

    public calcBounds() {
        const bounds = Bounds.getEmptyBounds();

        const vec = new Vector3(0, 0, 0);
        for (let i = 0; i < this._positionData.length; i += 3) {
            vec.set(
                this._positionData[i + 0],
                this._positionData[i + 1],
                this._positionData[i + 2],
            );
            bounds.extendByPoint(vec);
        }

        return bounds;
    }

    public getMaterials() {
        return this._materials.map((material) => {
            return OtS_Util.copyMaterial(material);
        });
    }

    public getTriangleCount() {
        return this._triangleData.length / OtS_Mesh._TRIANGLE_STRIDE;
    }
}

export function TEMP_CONVERT_MESH(vertices: Vector3[], uvs: UV[], tris: Tri[]): OtS_Mesh {
    const positionData = new Float32Array(3 * vertices.length);
    vertices.forEach((vertex, index) => {
        positionData[index * 3 + 0] = vertex.x;
        positionData[index * 3 + 1] = vertex.y;
        positionData[index * 3 + 2] = vertex.z;
    });

    const texcoordData = new Float32Array(2 * uvs.length);
    uvs.forEach((uv, index) => {
        texcoordData[index * 2 + 0] = uv.u;
        texcoordData[index * 2 + 1] = uv.v;
    });

    const materialNameToIndex = new Map<string, number>();
    const materials: Material[] = [];

    const triangleData = new Uint32Array(7 * tris.length);
    tris.forEach((tri, index) => {
        const materialName = tri.material;
        let materialIndex = materialNameToIndex.get(materialName);
        if (materialIndex === undefined) {
            materialIndex = materialNameToIndex.size;
            materialNameToIndex.set(materialName, materialIndex);

            const hasTexcoords = tri.texcoordIndices !== undefined;

            const material: SolidMaterial = {
                name: materialName,
                canBeTextured: hasTexcoords,
                colour: RGBAUtil.copy(RGBAColours.WHITE),
                type: 'solid',
            }

            materials.push(material);
        }

        triangleData[index * 7 + 0] = tri.positionIndices.x;
        triangleData[index * 7 + 1] = tri.positionIndices.y;
        triangleData[index * 7 + 2] = tri.positionIndices.z;
        triangleData[index * 7 + 3] = tri.texcoordIndices?.x ?? 0;
        triangleData[index * 7 + 4] = tri.texcoordIndices?.y ?? 0;
        triangleData[index * 7 + 5] = tri.texcoordIndices?.z ?? 0;
        triangleData[index * 7 + 6] = materialIndex;
    });

    return new OtS_Mesh(
        positionData,
        texcoordData,
        triangleData,
        materials,
    );
}