import { EFaceVisibility } from './block_assigner';
import { Bounds } from "./bounds";
import { RGBA, RGBAUtil } from './colour';
import { OcclusionManager } from "./occlusion";
import { Vector3 } from "./vector"

export type OtS_Voxel = {
    position: Vector3,
    colour: RGBA,
}

export type OtS_Offset = -1 | 0 | 1;
export type OtS_ReplaceMode = 'replace' | 'keep' | 'average';

type Ots_Voxel_Internal = OtS_Voxel & {
    collisions: number,
}

export class OtS_VoxelMesh {
    private _voxels: Map<number, Ots_Voxel_Internal>;
    private _bounds: Bounds;

    public constructor() {
        this._voxels = new Map();
        this._bounds = Bounds.getEmptyBounds();
    }

    public addVoxel(x: number, y: number, z: number, colour: RGBA, replaceMode: OtS_ReplaceMode) {
        const key = Vector3.Hash(x, y, z);
        let voxel: (Ots_Voxel_Internal | undefined) = this._voxels.get(key);

        if (voxel === undefined) {
            const position = new Vector3(x, y, z);
            voxel = {
                position: position,
                colour: RGBAUtil.copy(colour),
                collisions: 1,
            }
            this._bounds.extendByPoint(position);
        } else {
            if (replaceMode === 'average') {
                voxel.colour.r = ((voxel.colour.r * voxel.collisions) + colour.r) / (voxel.collisions + 1);
                voxel.colour.g = ((voxel.colour.g * voxel.collisions) + colour.g) / (voxel.collisions + 1);
                voxel.colour.b = ((voxel.colour.b * voxel.collisions) + colour.b) / (voxel.collisions + 1);
                voxel.colour.a = ((voxel.colour.a * voxel.collisions) + colour.a) / (voxel.collisions + 1);
                ++voxel.collisions;
            } else if (replaceMode === 'replace') {
                voxel.colour = RGBAUtil.copy(colour);
                voxel.collisions = 1;
            }
        }
    }

    /**
     * Remove a voxel from a given location.
     */
    public removeVoxel(x: number, y: number, z: number): boolean {
        const key = Vector3.Hash(x, y, z);
        return this._voxels.delete(key);
    }

    /**
     * Returns the colour of a voxel at a location, if one exists.
     * @note Modifying the returned colour will not update the voxel's colour.
     * For that, use `addVoxel` with the replaceMode set to 'replace'
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
     * Get whether or not there is a voxel at a given location.
     */
    public isVoxelAt(x: number, y: number, z: number) {
        const key = Vector3.Hash(x, y, z);
        return this._voxels.has(key);
    }

    /**
     * Get whether or not there is a opaque voxel at a given location.
     */
    public isOpaqueVoxelAt(x: number, y: number, z: number) {
        const voxel = this.getVoxelAt(x, y, z);
        return voxel === null ? false : voxel.colour.a === 1.0;
    }

    /**
     * Get the bounds/dimensions of the VoxelMesh.
     */
    public getBounds(): Bounds {
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
     * and editing each entry will not modify the underlying voxel.
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

export type OtS_NeighbourhoodMode = 'cardinal' | 'non-cardinal'; // | 'full';

/**
 * A util class to cache the voxel neighbours of a VoxelMesh
 */
export class OtS_VoxelMesh_Neighbourhood {
    private _voxelNeighbours: Map<number, number>;
    private _mode: OtS_NeighbourhoodMode | null;

    public constructor() {
        this._voxelNeighbours = new Map();
        this._mode = null;
    }

    /**
     * Runs the neighbourhood calculations, i.e. will go through voxel-by-voxel,
     * and cache what neighbours exist for each voxel. *Which* neighbours the
     * algorithm checks is determined by the 'mode':
     *   - cardinal: Only checks 6 neighbours (the up/down/north/south/east/west directions)
     *   - full:  Checks all 26 three-dimensional neighbours
     *
     * @note `process` takes a snapshot of the current state of voxelMesh and
     * will not update if more voxels are added to voxelMesh or the state of
     * voxelMesh changes in any other way.
     */
    public process(voxelMesh: OtS_VoxelMesh, mode: OtS_NeighbourhoodMode) {
        this._voxelNeighbours.clear();
        this._mode = mode;

        const neighboursToCheck = mode === 'cardinal'
            ? OtS_VoxelMesh_Neighbourhood._NEIGHBOURS_CARDINAL
            : OtS_VoxelMesh_Neighbourhood._NEIGHBOURS_NON_CARDINAL;

        const pos = new Vector3(0, 0, 0);
        for (const voxel of voxelMesh.getVoxels()) {
            let neighbourValue = 0;

            neighboursToCheck.forEach((neighbour) => {
                pos.setFrom(voxel.position);
                pos.add(neighbour.offset);

                if (voxelMesh.isOpaqueVoxelAt(pos.x, pos.y, pos.z)) {
                    neighbourValue |= (1 << neighbour.index);
                }
            })

            this._voxelNeighbours.set(voxel.position.hash(), neighbourValue);
        }
    }

    /**
     * Returns an encoded value representing the neighbours of the voxel at this
     * position. This is a confusing value to decode so instead use `hasNeighbour`
     * for checking if
     */
    public getNeighbours(x: number, y: number, z: number): number {
        const key = Vector3.Hash(x, y, z);
        const value = this._voxelNeighbours.get(key);
        return value === undefined ? 0 : value;
    }

    /*
     * Returns true if a voxel at position has a neighbour with offset 'offset'
     */
    public hasNeighbour(x: number, y: number, z: number, offsetX: OtS_Offset, offsetY: number, offsetZ: OtS_Offset): boolean {
        return (this.getNeighbours(x, y, z) & (1 << OcclusionManager.getNeighbourIndex(offsetX, offsetY, offsetZ))) > 0;
    }

    /**
     * Returns whether or not you can see each face on a voxel at a given location
     */
    public getFaceVisibility(x: number, y: number, z: number): EFaceVisibility {
        let visibility: EFaceVisibility = EFaceVisibility.None;

        if (!this.hasNeighbour(x, y, z, 1, 0, 0)) {
            visibility += EFaceVisibility.North;
        }
        if (!this.hasNeighbour(x, y, z, -1, 0, 0)) {
            visibility += EFaceVisibility.South;
        }
        if (!this.hasNeighbour(x, y, z, 0, 1, 0)) {
            visibility += EFaceVisibility.Up;
        }
        if (!this.hasNeighbour(x, y, z, 0, -1, 0)) {
            visibility += EFaceVisibility.Down;
        }
        if (!this.hasNeighbour(x, y, z, 0, 0, 1)) {
            visibility += EFaceVisibility.East;
        }
        if (!this.hasNeighbour(x, y, z, 0, 0, -1)) {
            visibility += EFaceVisibility.West;
        }

        return visibility;
    }

    /**
     * Get the mode that the data cached was built using.
     * Useful for debugging/testing.
     */
    public getModeProcessedUsing() {
        return this._mode;
    }

    private static readonly _NEIGHBOURS_NON_CARDINAL = [
        new Vector3(1, 1, -1),
        new Vector3(0, 1, -1),
        new Vector3(-1, 1, -1),
        new Vector3(1, 0, -1),
        new Vector3(-1, 0, -1),
        new Vector3(1, -1, -1),
        new Vector3(0, -1, -1),
        new Vector3(-1, -1, -1),
        new Vector3(1, 1, 0),
        new Vector3(-1, 1, 0),
        new Vector3(1, -1, 0),
        new Vector3(-1, -1, 0),
        new Vector3(1, 1, 1),
        new Vector3(0, 1, 1),
        new Vector3(-1, 1, 1),
        new Vector3(1, 0, 1),
        new Vector3(-1, 0, 1),
        new Vector3(1, -1, 1),
        new Vector3(0, -1, 1),
        new Vector3(-1, -1, 1),
    ].map((neighbourOffset) => {
        const inverseOffset = neighbourOffset.copy().negate();

        return {
            offset: neighbourOffset,
            index: OcclusionManager.getNeighbourIndex(neighbourOffset.x, neighbourOffset.y, neighbourOffset.z),
            inverseIndex: OcclusionManager.getNeighbourIndex(inverseOffset.x, inverseOffset.y, inverseOffset.z),
        };
    });

    private static readonly _NEIGHBOURS_CARDINAL = [
        new Vector3(1, 0, 0),
        new Vector3(-1, 0, 0),
        new Vector3(0, 1, 0),
        new Vector3(0, -1, 0),
        new Vector3(0, 0, 1),
        new Vector3(0, 0, -1),
    ].map((neighbourOffset) => {
        const inverseOffset = neighbourOffset.copy().negate();

        return {
            offset: neighbourOffset,
            index: OcclusionManager.getNeighbourIndex(neighbourOffset.x, neighbourOffset.y, neighbourOffset.z),
            inverseIndex: OcclusionManager.getNeighbourIndex(inverseOffset.x, inverseOffset.y, inverseOffset.z),
        };
    });
}