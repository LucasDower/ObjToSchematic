
import { Bounds } from "./bounds";
import { UV } from "./util";
import { Vector3 } from "./vector"

export interface TextureInfo {
    name: string,
    texcoord: UV,
}

export interface FaceInfo {
    [face: string]: TextureInfo,
    up: TextureInfo,
    down: TextureInfo,
    north: TextureInfo,
    south: TextureInfo,
    east: TextureInfo,
    west: TextureInfo
}

export type OtS_Block = {
    position: Vector3,
    name: string,
}

type OtS_Block_Internal = OtS_Block & {
}

export class OtS_BlockMesh {
    private _blocks: Map<number, OtS_Block_Internal>;
    private _isBoundsDirty: boolean;
    private _bounds: Bounds;

    public constructor() {
        this._blocks = new Map();
        this._bounds = Bounds.getEmptyBounds();
        this._isBoundsDirty = false;
    }

    public addBlock(x: number, y: number, z: number, blockName: string, replace: boolean) {
        const key = Vector3.Hash(x, y, z);
        let block: (OtS_Block_Internal | undefined) = this._blocks.get(key);

        if (block === undefined) {
            const position = new Vector3(x, y, z);
            block = {
                position: position,
                name: blockName,
            }
            this._blocks.set(key, block);
            this._isBoundsDirty = true;
        } else if (replace) {
            block.name = blockName;
        }
    }

    /**
     * Remove a block from a given location.
     */
    public removeBlock(x: number, y: number, z: number): boolean {
        const key = Vector3.Hash(x, y, z);
        const didRemove = this._blocks.delete(key);
        this._isBoundsDirty ||= didRemove;
        return didRemove;
    }

    /**
     * Returns the colour of a voxel at a location, if one exists.
     * @note Modifying the returned colour will not update the voxel's colour.
     * For that, use `addVoxel` with the replaceMode set to 'replace'
     */
    public getBlockAt(x: number, y: number, z: number): (OtS_Block | null) {
        const key = Vector3.Hash(x, y, z);
        const block = this._blocks.get(key);

        if (block === undefined) {
            return null;
        }

        return {
            position: block.position.copy(),
            name: block.name,
        };
    }

    /**
     * Get whether or not there is a voxel at a given location.
     */
    public isBlockAt(x: number, y: number, z: number) {
        const key = Vector3.Hash(x, y, z);
        return this._blocks.has(key);
    }

    /**
     * Get the bounds/dimensions of the VoxelMesh.
     */
    public getBounds(): Bounds {
        if (this._isBoundsDirty) {
            this._bounds = Bounds.getEmptyBounds();
            this._blocks.forEach((value, key) => {
                this._bounds.extendByPoint(value.position);
            });
            this._isBoundsDirty = false;
        }
        return this._bounds.copy();
    }

    /**
     * Get the number of voxels in the VoxelMesh.
     */
    public getBlockCount(): number {
        return this._blocks.size;
    }

    /**
     * Iterate over the voxels in this VoxelMesh, note that these are copies
     * and editing each entry will not modify the underlying voxel.
     */
    public getBlocks(): IterableIterator<OtS_Block> {
        const blocksCopy: OtS_Block[] = Array.from(this._blocks.values()).map((block) => {
            return {
                position: block.position.copy(),
                name: block.name,
            };
        });

        let currentIndex = 0;

        return {
            [Symbol.iterator]: function () {
                return this;
            },
            next: () => {
                if (currentIndex < blocksCopy.length) {
                    const block = blocksCopy[currentIndex++];
                    return { done: false, value: block };
                } else {
                    return { done: true, value: undefined };
                }
            },
        };
    }

    public calcBlocksUsed(): Set<string> {
        const blocksUsed = new Set<string>();

        for (const block of this.getBlocks()) {
            blocksUsed.add(block.name);
        }

        return blocksUsed;
    }
}