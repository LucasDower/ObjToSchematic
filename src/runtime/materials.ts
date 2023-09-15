import { RGBA, RGBAUtil } from './colour';
import { EImageChannel, TImageRawWrap, TTransparencyOptions, TTransparencyTypes } from './texture';
import { ASSERT } from './util/error_util';
import { TTexelExtension, TTexelInterpolation } from './util/type_util';

export enum MaterialType { solid, textured }

type BaseMaterial = {
    name: string,
    needsAttention: boolean, // True if the user should make edits to this material
}

export type SolidMaterial = BaseMaterial & {
    type: MaterialType.solid,
    colour: RGBA,
    canBeTextured: boolean,
}
export type TexturedMaterial = BaseMaterial & {
    type: MaterialType.textured,
    diffuse?: TImageRawWrap,
    interpolation: TTexelInterpolation,
    extension: TTexelExtension,
    transparency: TTransparencyOptions,
}

export type Material = SolidMaterial | TexturedMaterial;

export class MaterialMapManager {
    private _materials: Material[];

    public constructor(materials: Material[]) {
        this._materials = materials;
    }

    public getCount() {
        return this._materials.length;
    }

    public getMaterial(materialName: string) {
        const material = this._materials.find((someMaterial) => materialName === someMaterial.name);
        if (material !== undefined) {
            return MaterialMapManager.CopyMaterial(material);
        }
        return undefined;
    }

    private _setMaterial(materialName: string, material: Material): boolean {
        const materialIndex = this._materials.findIndex((someMaterial) => materialName === someMaterial.name);
        ASSERT(materialIndex !== -1, 'Cannot set undefined material');

        // TODO: Check new material is valid, check solid material can become texture material, i.e. has texcoords.

        this._materials[materialIndex] = material;
        return true;
    }

    public changeTransparencyType(materialName: string, newTransparencyType: TTransparencyTypes) {
        const currentMaterial = this.getMaterial(materialName);
        ASSERT(currentMaterial !== undefined, 'Cannot change transparency type of non-existent material');
        ASSERT(currentMaterial.type === MaterialType.textured);

        switch (newTransparencyType) {
            case 'None':
                currentMaterial.transparency = { type: 'None' };
                break;
            case 'UseAlphaMap':
                currentMaterial.transparency = {
                    type: 'UseAlphaMap',
                    alpha: undefined,
                    channel: EImageChannel.R,
                };
                break;
            case 'UseAlphaValue':
                currentMaterial.transparency = {
                    type: 'UseAlphaValue',
                    alpha: 1.0,
                };
                break;
            case 'UseDiffuseMapAlphaChannel':
                currentMaterial.transparency = {
                    type: 'UseDiffuseMapAlphaChannel',
                };
                break;
        }

        this._setMaterial(materialName, currentMaterial);
    }

    /**
     * Convert a material to a new type, i.e. textured to solid.
     * Will return if the material is already the given type.
     */
    public changeMaterialType(materialName: string, newMaterialType: MaterialType) {
        const currentMaterial = this.getMaterial(materialName);
        ASSERT(currentMaterial !== undefined, 'Cannot change material type of non-existent material');

        if (currentMaterial.type === newMaterialType) {
            return;
        }

        switch (newMaterialType) {
            case MaterialType.solid:
                ASSERT(currentMaterial.type === MaterialType.textured, 'Old material expect to be texture');
                this._setMaterial(materialName, {
                    name: materialName,
                    type: MaterialType.solid,
                    colour: RGBAUtil.randomPretty(),
                    canBeTextured: true,
                    needsAttention: true,
                });
                break;
            case MaterialType.textured:
                ASSERT(currentMaterial.type === MaterialType.solid, 'Old material expect to be solid');
                this._setMaterial(materialName, {
                    name: materialName,
                    type: MaterialType.textured,
                    transparency: {
                        type: 'None',
                    },
                    extension: 'repeat',
                    interpolation: 'linear',
                    needsAttention: true,
                    diffuse: undefined,
                });
                break;
        }
    }

    public static CopyMaterial(material: Material): Material {
        return JSON.parse(JSON.stringify(material));
    }

    public toMaterialArray() {
        return this._materials.map((material) => MaterialMapManager.CopyMaterial(material));
    }
}