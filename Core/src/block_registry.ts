import { RGBA } from "./colour"

export type OtS_BlockData = {
    north: RGBA,
    south: RGBA,
    up: RGBA,
    down: RGBA,
    east: RGBA,
    west: RGBA,
};

export class OtS_BlockRegistry {
    private _blocks: Map<string, OtS_BlockData>;

    public constructor() {
        this._blocks = new Map();
    }

    public register(blockName: string, blockData: OtS_BlockData) {
        this._blocks.set(blockName, blockData);
        return this;
    }
}