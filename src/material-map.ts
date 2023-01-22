import { RGBAColours } from './colour';
import { MaterialMap, MaterialType } from './mesh';
import { ASSERT } from './util/error_util';
import { AppPaths, PathUtil } from './util/path_util';

export class MaterialMapManager {
    public materials: MaterialMap;

    public constructor(materials: MaterialMap) {
        this.materials = materials;
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
                this.materials.set(materialName, {
                    type: MaterialType.solid,
                    colour: RGBAColours.MAGENTA,
                    canBeTextured: currentMaterial.canBeTextured,
                    needsAttention: true,
                });
                break;
            case MaterialType.textured:
                this.materials.set(materialName, {
                    type: MaterialType.textured,
                    alphaFactor: 1.0,
                    alphaPath: undefined,
                    canBeTextured: currentMaterial.canBeTextured,
                    extension: 'repeat',
                    interpolation: 'linear',
                    needsAttention: true,
                    path: PathUtil.join(AppPaths.Get.static, 'debug.png'),
                });
                break;
        }
    }
}
