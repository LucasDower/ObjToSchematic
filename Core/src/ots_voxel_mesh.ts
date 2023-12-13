
import { Bounds } from "./util/bounds";
import { RGBA, RGBAUtil } from './util/colour';
import { Vector3 } from "./util/vector"

export type OtS_Voxel = {
    position: Vector3,
    colour: RGBA,
}

export type OtS_ReplaceMode = 'replace' | 'keep' | 'average';

type OtS_Voxel_Internal = OtS_Voxel & {
    collisions: number,
}

export class OtS_VoxelMesh {
    private _voxels: Map<number, OtS_Voxel_Internal>;
    private _isBoundsDirty: boolean;
    private _bounds: Bounds;
    private _replaceMode: OtS_ReplaceMode;

    /**
     * Create a new voxel mesh
     * @returns A new `OtS_VoxelMesh` instance
     */
    public static Create(): OtS_VoxelMesh {
        return new OtS_VoxelMesh();
    }

    private constructor() {
        this._voxels = new Map();
        this._bounds = Bounds.getEmptyBounds();
        this._isBoundsDirty = false;
        this._replaceMode = 'average';
    }

    /**
     * Set the behaviour for what should happen when adding a voxel in a
     * position where one already exists
     * @param replaceMode The behaviour to set
     */
    public setReplaceMode(replaceMode: OtS_ReplaceMode) {
        this._replaceMode = replaceMode;
    }

    /**
     * Add a voxel at a position with a particular colour
     * @param x The x-coordinate (north/south)
     * @param y The y-coordinate (up/down)
     * @param z The z-coordinate (east/west)
     * @param colour The colour of the voxel
     */
    public addVoxel(x: number, y: number, z: number, colour: RGBA) {
        const key = Vector3.Hash(x, y, z);
        let voxel: (OtS_Voxel_Internal | undefined) = this._voxels.get(key);

        if (voxel === undefined) {
            const position = new Vector3(x, y, z);
            voxel = {
                position: position,
                colour: RGBAUtil.copy(colour),
                collisions: 1,
            }
            this._voxels.set(key, voxel);
            //this._bounds.extendByPoint(position);
            this._isBoundsDirty = true;
        } else {
            if (this._replaceMode === 'average') {
                voxel.colour.r = ((voxel.colour.r * voxel.collisions) + colour.r) / (voxel.collisions + 1);
                voxel.colour.g = ((voxel.colour.g * voxel.collisions) + colour.g) / (voxel.collisions + 1);
                voxel.colour.b = ((voxel.colour.b * voxel.collisions) + colour.b) / (voxel.collisions + 1);
                voxel.colour.a = ((voxel.colour.a * voxel.collisions) + colour.a) / (voxel.collisions + 1);
                ++voxel.collisions;
            } else if (this._replaceMode === 'replace') {
                voxel.colour = RGBAUtil.copy(colour);
                voxel.collisions = 1;
            }
        }
    }

    /**
     * Remoave a voxel at a position
     * @param x The x-coordinate (north/south)
     * @param y The y-coordinate (up/down)
     * @param z The z-coordinate (east/west)
     * @returns Whether or not a voxel was found and removed
     */
    public removeVoxel(x: number, y: number, z: number): boolean {
        const key = Vector3.Hash(x, y, z);
        const didRemove = this._voxels.delete(key);
        this._isBoundsDirty ||= didRemove;
        return didRemove;
    }

    /**
     * Returns a copy of the voxel at a location, if one exists
     * @param x The x-coordinate (north/south)
     * @param y The y-coordinate (up/down)
     * @param z The z-coordinate (east/west)
     * @returns The copy of the voxel or null if one does not exist
     */
    public getVoxelAt(x: number, y: number, z: number): (OtS_Voxel | null) {
        const key = Vector3.Hash(x, y, z);
        const voxel = this._voxels.get(key);

        if (voxel === undefined) {
            return null;
        }

        return {
            position: voxel.position.copy(),
            colour: RGBAUtil.copy(voxel.colour),
        }
    }

    /**
     * Get whether or not there is a voxel at a given location
     * @param x The x-coordinate (north/south)
     * @param y The y-coordinate (up/down)
     * @param z The z-coordinate (east/west)
     * @returns Whether or not a voxel is at this location
     */
    public isVoxelAt(x: number, y: number, z: number): boolean {
        const key = Vector3.Hash(x, y, z);
        return this._voxels.has(key);
    }

    /**
     * Get whether or not there is a opaque voxel at a given location
     * @param x The x-coordinate (north/south)
     * @param y The y-coordinate (up/down)
     * @param z The z-coordinate (east/west)
     * @returns Whether or not an opaque voxel is at this location
     */
    public isOpaqueVoxelAt(x: number, y: number, z: number) {
        const voxel = this.getVoxelAt(x, y, z);
        return voxel === null ? false : voxel.colour.a === 1.0;
    }

    /**
     * Get the bounds/dimensions of the voxel mesh
     * @returns The bounds of the voxel mesh
     */
    public getBounds(): Bounds {
        if (this._isBoundsDirty) {
            this._bounds = Bounds.getEmptyBounds();
            this._voxels.forEach((value, key) => {
                this._bounds.extendByPoint(value.position);
            });
            this._isBoundsDirty = false;
        }
        return this._bounds.copy();
    }

    /**
     * Get the number of voxels in the VoxelMesh.
     */
    public getVoxelCount(): number {
        return this._voxels.size;
    }

    /**
     * Iterate over the voxels in this VoxelMesh, note that these are copies
     * and editing each entry will not modify the underlying voxel
     * @returns An iterator to the voxels
     */
    public getVoxels(): IterableIterator<OtS_Voxel> {
        const voxelsCopy: OtS_Voxel[] = Array.from(this._voxels.values()).map((voxel) => {
            return {
                position: voxel.position.copy(),
                colour: RGBAUtil.copy(voxel.colour),
            }
        });

        let currentIndex = 0;

        return {
            [Symbol.iterator]: function () {
                return this;
            },
            next: () => {
                if (currentIndex < voxelsCopy.length) {
                    const voxel = voxelsCopy[currentIndex++];
                    return { done: false, value: voxel };
                } else {
                    return { done: true, value: undefined };
                }
            },
        };
    }
}