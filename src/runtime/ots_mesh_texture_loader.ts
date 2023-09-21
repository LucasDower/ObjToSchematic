import { OtS_Mesh } from "./ots_mesh";
import { Texture } from "./texture";

export class OtS_Mesh_TextureLoader {
    private _textures: Map<string, Texture>;

    public constructor() {
        this._textures = new Map();
    }

    public load(mesh: OtS_Mesh) {
        this._textures.clear();

        mesh.getMaterials().forEach((material) => {
            if (material.type === 'textured') {
                this._textures.set(
                    material.name,
                    new Texture({ 
                        diffuse: material.diffuse,
                        transparency: material.transparency
                    })
                );
            }
        });
    }

    public getTexture(materialName: string) {
        return this._textures.get(materialName);
    }
}