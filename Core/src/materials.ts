import { RGBA, RGBAUtil } from './colour';
import { OtS_Texture } from './ots_texture';

// export type OtS_MaterialType = 'solid' | 'textured';

// type BaseMaterial = {
//     //name: string,
// }

// export type SolidMaterial = BaseMaterial & {
//     type: 'solid'
//     //canBeTextured: boolean,
// }
// export type TexturedMaterial = BaseMaterial & {
//     type: 'textured',
//     texture: OtS_Texture,
// }

// export type Material = SolidMaterial | TexturedMaterial;

// export namespace OtS_Util {
//     export function copySolidMaterial(material: SolidMaterial): SolidMaterial {
//         return {
//             type: 'solid',
//             colour: RGBAUtil.copy(material.colour),
//         };
//     }

//     export function copyTexturedMaterial(material: TexturedMaterial): TexturedMaterial {
//         return {
//             type: 'textured',
//             texture: material.texture.copy(),
//         }
//     }

//     export function copyMaterial(material: Material): Material {
//         if (material.type === 'solid') {
//             return OtS_Util.copySolidMaterial(material);
//         } else {
//             return OtS_Util.copyTexturedMaterial(material);
//         }
//     }
// }