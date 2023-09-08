import { EFaceVisibility } from '../runtime/block_assigner';
import { Bounds } from './bounds';
import { RGBA } from '../runtime/colour';
import { OcclusionManager } from './occlusion';
import { TOptional } from './util';
import { Vector3 } from './vector';

export interface Voxel {
    position: Vector3,
    colour: RGBA,
    collisions: number,
    neighbours: number,
}

export type TVoxelOverlapRule = 'first' | 'average';

export class VoxelMesh {
    private _voxels: Map<number, Voxel>;
    private _bounds: Bounds;
    private readonly _overlapRule: TVoxelOverlapRule;
    private readonly _ambientOcclusion: boolean;

    public constructor(overlapRule: TVoxelOverlapRule, ambientOcclusion: boolean) {
        this._voxels = new Map();
        this._bounds = Bounds.getEmptyBounds();
        this._overlapRule = overlapRule;
        this._ambientOcclusion = ambientOcclusion;
    }

    public getVoxels(): Voxel[] {
        return Array.from(this._voxels.values());
    }

    public isVoxelAt(pos: Vector3): boolean {
        return this._voxels.has(pos.hash());
    }

    public isOpaqueVoxelAt(pos: Vector3): boolean {
        const voxel = this.getVoxelAt(pos);
        if (voxel) {
            return voxel.colour.a == 1.0;
        }
        return false;
    }

    public getVoxelAt(pos: Vector3): TOptional<Voxel> {
        return this._voxels.get(pos.hash());
    }

    public static getFullFaceVisibility(): EFaceVisibility {
        return EFaceVisibility.Up | EFaceVisibility.Down | EFaceVisibility.North | EFaceVisibility.West | EFaceVisibility.East | EFaceVisibility.South;
    }

    public getFaceVisibility(pos: Vector3) {
        let visibility: EFaceVisibility = 0;
        if (!this.isOpaqueVoxelAt(Vector3.add(pos, new Vector3(0, 1, 0)))) {
            visibility += EFaceVisibility.Up;
        }
        if (!this.isOpaqueVoxelAt(Vector3.add(pos, new Vector3(0, -1, 0)))) {
            visibility += EFaceVisibility.Down;
        }
        if (!this.isOpaqueVoxelAt(Vector3.add(pos, new Vector3(1, 0, 0)))) {
            visibility += EFaceVisibility.North;
        }
        if (!this.isOpaqueVoxelAt(Vector3.add(pos, new Vector3(-1, 0, 0)))) {
            visibility += EFaceVisibility.South;
        }
        if (!this.isOpaqueVoxelAt(Vector3.add(pos, new Vector3(0, 0, 1)))) {
            visibility += EFaceVisibility.East;
        }
        if (!this.isOpaqueVoxelAt(Vector3.add(pos, new Vector3(0, 0, -1)))) {
            visibility += EFaceVisibility.West;
        }
        return visibility;
    }

    public addVoxel(inPos: Vector3, colour: RGBA) {
        if (colour.a === 0) {
            return;
        }

        const pos = inPos.copy().round();
        const voxel = this._voxels.get(pos.hash());

        if (voxel !== undefined) {
            if (this._overlapRule === 'average') {
                voxel.colour.r = ((voxel.colour.r * voxel.collisions) + colour.r) / (voxel.collisions + 1);
                voxel.colour.g = ((voxel.colour.g * voxel.collisions) + colour.g) / (voxel.collisions + 1);
                voxel.colour.b = ((voxel.colour.b * voxel.collisions) + colour.b) / (voxel.collisions + 1);
                voxel.colour.a = ((voxel.colour.a * voxel.collisions) + colour.a) / (voxel.collisions + 1);
                ++voxel.collisions;
            }
        } else {
            this._voxels.set(pos.hash(), {
                position: pos,
                colour: colour,
                collisions: 1,
                neighbours: 0,
            });
            this._bounds.extendByPoint(pos);
        }
    }

    public getBounds() {
        return this._bounds;
    }

    public getVoxelCount(): number {
        return this._voxels.size;
    }

    private static _Neighbours = [
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

    /**
     * Goes through each voxel and calculates what voxel neighbours it has.
     * This is used for ambient occlusion.
     * @note This does NOT check all 27 neighbours, i.e. it does not check voxels
     * directly up, down, north, south, east, west as they're not needed.
     */
    public calculateNeighbours() {
        if (!this._ambientOcclusion) {
            return;
        }

        const pos = new Vector3(0, 0, 0);

        this._voxels.forEach((voxel) => {
            voxel.neighbours = 0;

            VoxelMesh._Neighbours.forEach((neighbour) => {
                pos.setFrom(voxel.position);
                pos.add(neighbour.offset);

                if (this.isVoxelAt(pos)) {
                    voxel.neighbours |= (1 << neighbour.index);
                }
            });
        });
    }

    public getNeighbours(pos: Vector3) {
        return this._voxels.get(pos.hash())?.neighbours ?? 0;
    }

    /*
     * Returns true if a voxel at position 'pos' has a neighbour with offset 'offset'
     * Offset must be a vector that exists within this._neighbours defined above
     */
    public hasNeighbour(pos: Vector3, offset: Vector3): boolean {
        return (this.getNeighbours(pos) & (1 << OcclusionManager.getNeighbourIndex(offset.x, offset.y, offset.z))) > 0;
    }
}
