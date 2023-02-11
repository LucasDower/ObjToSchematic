import { RGBAColours } from './colour';
import { MaterialMap, MaterialType } from './mesh';
import { EImageChannel, TTransparencyTypes } from './texture';
import { ASSERT } from './util/error_util';

export class MaterialMapManager {
    public materials: MaterialMap;

    public constructor(materials: MaterialMap) {
        this.materials = materials;
    }

    public changeTransparencyType(materialName: string, newTransparencyType: TTransparencyTypes) {
        const currentMaterial = this.materials.get(materialName);
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

        this.materials.set(materialName, currentMaterial);
    }

    /**
     * Convert a material to a new type, i.e. textured to solid.
     * Will return if the material is already the given type.
     */
    public changeMaterialType(materialName: string, newMaterialType: MaterialType) {
        const currentMaterial = this.materials.get(materialName);
        ASSERT(currentMaterial !== undefined, 'Cannot change material type of non-existent material');

        if (currentMaterial.type === newMaterialType) {
            return;
        }

        switch (newMaterialType) {
            case MaterialType.solid:
                ASSERT(currentMaterial.type === MaterialType.textured, 'Old material expect to be texture');
                this.materials.set(materialName, {
                    type: MaterialType.solid,
                    colour: RGBAColours.MAGENTA,
                    canBeTextured: true,
                    needsAttention: true,
                });
                break;
            case MaterialType.textured:
                ASSERT(currentMaterial.type === MaterialType.solid, 'Old material expect to be solid');
                this.materials.set(materialName, {
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
}
