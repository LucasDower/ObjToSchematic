import { parse } from '@loaders.gl/core';
import { GLTFLoader } from '@loaders.gl/gltf';

import { RGBAColours, RGBAUtil } from '../colour';
import { LOC } from '../localiser';
import { MaterialMap, MaterialType, Mesh, Tri } from '../mesh';
import { StatusHandler } from '../status';
import { UV } from '../util';
import { AppError } from '../util/error_util';
import { Vector3 } from '../vector';
import { IImporter } from './base_importer';

export class GltfLoader extends IImporter {
    public override import(file: File): Promise<Mesh> {
        StatusHandler.warning(LOC('import.gltf_experimental'));

        return new Promise<Mesh>((resolve, reject) => {
            parse(file, GLTFLoader, { loadImages: true })
                .then((gltf: any) => {
                    resolve(this._handleGLTF(gltf));
                })
                .catch((err: any) => {
                    reject(err);
                });
        });
    }

    private _handleGLTF(gltf: any): Mesh {
        const meshVertices: Vector3[] = [];
        const meshNormals: Vector3[] = [];
        const meshTexcoords: UV[] = [];
        const meshTriangles: Tri[] = [];
        const meshMaterials: MaterialMap = new Map();

        meshMaterials.set('NONE', {
            type: MaterialType.solid,
            colour: RGBAUtil.copy(RGBAColours.WHITE),
            needsAttention: false,
            canBeTextured: false,
        });

        let maxIndex = 0;
        let materialIndex = 0; // New variable to create unique material identifiers

        Object.values(gltf.meshes).forEach((mesh: any) => {
            Object.values(mesh.primitives).forEach((primitive: any) => {
                const attributes = primitive.attributes;

                // Handling vertices
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

                // Handling normals
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

                // Handling texture coordinates
                if (attributes.TEXCOORD_0 !== undefined) {
                    const texcoords = attributes.TEXCOORD_0.value as Float32Array;
                    for (let i = 0; i < texcoords.length; i += 2) {
                        meshTexcoords.push(new UV(
                            texcoords[i + 0],
                            1.0 - texcoords[i + 1],
                        ));
                    }
                }

                // Material
                let materialBaseName = 'NONE';
                if (primitive.material) {
                    materialBaseName = primitive.material.name || 'Material';
                }

                const materialNameToUse = materialBaseName + '_' + materialIndex; // Unique material identifier
                materialIndex++; // Increment material index

                // Handling materials
                if (primitive.material) {
                    const pbr = primitive.material.pbrMetallicRoughness;
                    if (pbr !== undefined) {
                        const diffuseTexture = pbr.baseColorTexture;
                        if (diffuseTexture !== undefined) {
                            const imageData: Uint8Array = diffuseTexture.texture.source.bufferView.data;
                            const mimeType: string = diffuseTexture.texture.source.mimeType;

                            try {
                                if (mimeType !== 'image/png' && mimeType !== 'image/jpeg') {
                                    StatusHandler.warning(LOC('import.unsupported_image_type', { file_name: diffuseTexture.texture.source.id, file_type: mimeType }));
                                    throw new Error('Unsupported image type');
                                }

                                const base64 = btoa(
                                    imageData.reduce((data, byte) => data + String.fromCharCode(byte), ''),
                                );

                                meshMaterials.set(materialNameToUse, {
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
                                meshMaterials.set(materialNameToUse, {
                                    type: MaterialType.solid,
                                    colour: RGBAUtil.copy(RGBAColours.WHITE),
                                    needsAttention: false,
                                    canBeTextured: true,
                                });
                            }
                        }
                    }
                }

                // Indices
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
            });
        });

        return new Mesh(
            meshVertices,
            meshNormals,
            meshTexcoords,
            meshTriangles,
            meshMaterials,
        );
    }
}
