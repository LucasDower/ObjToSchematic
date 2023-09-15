import { parse } from '@loaders.gl/core';
import { GLTFLoader } from '@loaders.gl/gltf';

import { RGBAColours, RGBAUtil } from '../colour';
import { MaterialMap, MaterialType, Mesh, Tri } from '../mesh';
import { UV } from '../util';
import { Vector3 } from '../vector';
import { IImporter } from './base_importer';

export type TGltfImporterError =
    | { type: 'failed-to-parse' }
    | { type: 'unsupported-image-format' };

export class GltfImporterError extends Error {
    public error: TGltfImporterError;

    constructor(error: TGltfImporterError) {
        super();
        this.error = error;
    }
}

export class GltfLoader extends IImporter {
    public override async import(file: File): Promise<Mesh> {
        // TODO: StatusRework
        //StatusHandler.warning(LOC('import.gltf_experimental'));

        let gltf;
        try {
            gltf = await parse(file, GLTFLoader, { loadImages: true });
        } catch (err) {
            throw new GltfImporterError({ type: 'failed-to-parse' });
        }

        return this._handleGLTF(gltf);
    }

    private _handleGLTF(gltf: any): Mesh {
        const meshVertices: Vector3[] = [];
        const meshNormals: Vector3[] = [];
        const meshTexcoords: UV[] = [];
        const meshTriangles: Tri[] = [];
        const meshMaterials: MaterialMap = new Map();
        meshMaterials.set('NONE', {
            name: 'NONE',
            type: MaterialType.solid,
            colour: RGBAUtil.copy(RGBAColours.WHITE),
            needsAttention: false,
            canBeTextured: false,
        });
        let maxIndex = 0;

        Object.values(gltf.meshes).forEach((mesh: any) => {
            Object.values(mesh.primitives).forEach((primitive: any) => {
                const attributes = primitive.attributes;
                if (attributes.POSITION !== undefined) {
                    const positions = attributes.POSITION.value as Float32Array;
                    for (let i = 0; i < positions.length; i += 3) {
                        meshVertices.push(new Vector3(
                            positions[i + 0],
                            positions[i + 1],
                            positions[i + 2],
                        ));
                    }
                }
                if (attributes.NORMAL !== undefined) {
                    const normals = attributes.NORMAL.value as Float32Array;
                    for (let i = 0; i < normals.length; i += 3) {
                        meshNormals.push(new Vector3(
                            normals[i + 0],
                            normals[i + 1],
                            normals[i + 2],
                        ));
                    }
                }
                if (attributes.TEXCOORD_0 !== undefined) {
                    const texcoords = attributes.TEXCOORD_0.value as Float32Array;
                    for (let i = 0; i < texcoords.length; i += 2) {
                        meshTexcoords.push({
                            u: texcoords[i + 0],
                            v: 1.0 - texcoords[i + 1],
                        });
                    }
                }
                // Material
                let materialNameToUse = 'NONE';
                {
                    if (primitive.material) {
                        const materialName = primitive.material.name;

                        let materialMade = false;

                        const pbr = primitive.material.pbrMetallicRoughness;
                        if (pbr !== undefined) {
                            const diffuseTexture = pbr.baseColorTexture;
                            if (diffuseTexture !== undefined) {
                                const imageData: Uint8Array = diffuseTexture.texture.source.bufferView.data;
                                const mimeType: string = diffuseTexture.texture.source.mimeType;

                                try {
                                    if (mimeType !== 'image/png' && mimeType !== 'image/jpeg') {
                                        // TODO: StatusRework
                                        //StatusHandler.warning(LOC('import.unsupported_image_type', { file_name: diffuseTexture.texture.source.id, file_type: mimeType }));
                                        throw new GltfImporterError({ type: 'unsupported-image-format' })
                                    }

                                    const base64 = btoa(
                                        imageData.reduce((data, byte) => data + String.fromCharCode(byte), ''),
                                    );

                                    meshMaterials.set(materialName, {
                                        name: materialName,
                                        type: MaterialType.textured,
                                        diffuse: {
                                            filetype: mimeType === 'image/jpeg' ? 'jpg' : 'png',
                                            raw: (mimeType === 'image/jpeg' ? 'data:image/jpeg;base64,' : 'data:image/png;base64,') + base64,
                                        },
                                        extension: 'clamp',
                                        interpolation: 'linear',
                                        needsAttention: false,
                                        transparency: { type: 'None' },
                                    });
                                } catch {
                                    meshMaterials.set(materialName, {
                                        name: materialName,
                                        type: MaterialType.solid,
                                        colour: RGBAUtil.copy(RGBAColours.WHITE),
                                        needsAttention: false,
                                        canBeTextured: true,
                                    });
                                }


                                /*

                                */

                                materialNameToUse = materialName;
                                materialMade = true;
                            } else {
                                const diffuseColour: (number[] | undefined) = pbr.baseColorFactor;

                                if (diffuseColour !== undefined) {
                                    meshMaterials.set(materialName, {
                                        name: materialName,
                                        type: MaterialType.solid,
                                        colour: {
                                            r: diffuseColour[0],
                                            g: diffuseColour[1],
                                            b: diffuseColour[2],
                                            a: diffuseColour[3],
                                        },
                                        needsAttention: false,
                                        canBeTextured: false,
                                    });
                                }

                                materialNameToUse = materialName;
                                materialMade = true;
                            }
                        }

                        const emissiveColour: (number[] | undefined) = primitive.material.pbr;
                        if (!materialMade && emissiveColour !== undefined) {
                            meshMaterials.set(materialName, {
                                name: materialName,
                                type: MaterialType.solid,
                                colour: {
                                    r: emissiveColour[0],
                                    g: emissiveColour[1],
                                    b: emissiveColour[2],
                                    a: 1.0,
                                },
                                needsAttention: false,
                                canBeTextured: false,
                            });

                            materialNameToUse = materialName;
                            materialMade = true;
                        }
                    }
                }
                // Indices
                {
                    const indices = primitive.indices.value as Uint16Array;
                    for (let i = 0; i < indices.length / 3; ++i) {
                        meshTriangles.push({
                            material: materialNameToUse,
                            positionIndices: {
                                x: maxIndex + indices[i * 3 + 0],
                                y: maxIndex + indices[i * 3 + 1],
                                z: maxIndex + indices[i * 3 + 2],
                            },
                            texcoordIndices: {
                                x: maxIndex + indices[i * 3 + 0],
                                y: maxIndex + indices[i * 3 + 1],
                                z: maxIndex + indices[i * 3 + 2],
                            },
                        });
                    }

                    let localMax = 0;
                    for (let i = 0; i < indices.length; ++i) {
                        localMax = Math.max(localMax, indices[i]);
                    }

                    maxIndex += localMax + 1;
                }
            });
        });

        const mesh = new Mesh(
            meshVertices,
            meshNormals,
            meshTexcoords,
            meshTriangles,
            meshMaterials,
        );

        return mesh;
    }
}
