import { RGBA } from "./colour";
//import { Material, OtS_Util } from "./materials";
import { OtS_Texture } from "./ots_texture";

export type OtS_MeshSection = { positionData: Float32Array, indexData: Uint32Array } & (
    | { type: 'solid', colour: RGBA }
    | { type: 'colour', colourData: Float32Array }
    | { type: 'textured', texcoordData: Float32Array, texture: OtS_Texture });

/*
export class OtS_MaterialSlots {
    private _slots: Map<number, Material>;

    private constructor() {
        this._slots = new Map();
    }

    public static create() {
        return new OtS_MaterialSlots();
    }

    public setSlot(index: number, material: Material) {
        this._slots.set(index, material);
    }

    public getSlot(index: number) {
        return this._slots.get(index);
    }

    public copy() {
        const clone = OtS_MaterialSlots.create();

        this._slots.forEach((value, key) => {
            clone.setSlot(key, OtS_Util.copyMaterial(value));
        });

        return clone;
    }
}
*/