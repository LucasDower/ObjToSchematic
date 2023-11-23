import { OtS_VoxelMesh } from "./ots_voxel_mesh";
import { Vector3 } from "./util/vector";

export type OtS_Offset = -1 | 0 | 1;
export type OtS_NeighbourhoodMode = 'cardinal' | 'non-cardinal';
export enum OtS_FaceVisibility {
    None = 0,
    Up = 1 << 0,
    Down = 1 << 1,
    North = 1 << 2,
    East = 1 << 3,
    South = 1 << 4,
    West = 1 << 5,
    Full = Up | Down | North | East | South | West,
}

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
    public hasNeighbour(x: number, y: number, z: number, offsetX: OtS_Offset, offsetY: OtS_Offset, offsetZ: OtS_Offset): boolean {
        return (this.getNeighbours(x, y, z) & (1 << OtS_VoxelMesh_Neighbourhood.getNeighbourIndex(offsetX, offsetY, offsetZ))) > 0;
    }

    /**
     * Returns whether or not you can see each face on a voxel at a given location
     */
    public getFaceVisibility(x: number, y: number, z: number): (OtS_FaceVisibility | null) {
        if (this._mode !== 'cardinal') {
            return null;
        }

        let visibility: OtS_FaceVisibility = OtS_FaceVisibility.None;

        if (!this.hasNeighbour(x, y, z, 1, 0, 0)) {
            visibility += OtS_FaceVisibility.North;
        }
        if (!this.hasNeighbour(x, y, z, -1, 0, 0)) {
            visibility += OtS_FaceVisibility.South;
        }
        if (!this.hasNeighbour(x, y, z, 0, 1, 0)) {
            visibility += OtS_FaceVisibility.Up;
        }
        if (!this.hasNeighbour(x, y, z, 0, -1, 0)) {
            visibility += OtS_FaceVisibility.Down;
        }
        if (!this.hasNeighbour(x, y, z, 0, 0, 1)) {
            visibility += OtS_FaceVisibility.East;
        }
        if (!this.hasNeighbour(x, y, z, 0, 0, -1)) {
            visibility += OtS_FaceVisibility.West;
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

    public static getNeighbourIndex(x: OtS_Offset, y: OtS_Offset, z: OtS_Offset) {
        return 9 * (x + 1) + 3 * (y + 1) + (z + 1);
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
            index: OtS_VoxelMesh_Neighbourhood.getNeighbourIndex(neighbourOffset.x as OtS_Offset, neighbourOffset.y as OtS_Offset, neighbourOffset.z as OtS_Offset),
            inverseIndex: OtS_VoxelMesh_Neighbourhood.getNeighbourIndex(inverseOffset.x as OtS_Offset, inverseOffset.y as OtS_Offset, inverseOffset.z as OtS_Offset),
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
            index: OtS_VoxelMesh_Neighbourhood.getNeighbourIndex(neighbourOffset.x as OtS_Offset, neighbourOffset.y as OtS_Offset, neighbourOffset.z as OtS_Offset),
            inverseIndex: OtS_VoxelMesh_Neighbourhood.getNeighbourIndex(inverseOffset.x as OtS_Offset, inverseOffset.y as OtS_Offset, inverseOffset.z as OtS_Offset),
        };
    });
}