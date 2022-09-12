import { Bounds } from './bounds';
import { BufferGenerator, TVoxelMeshBufferDescription } from './buffer';
import { RGBA } from './colour';
import { HashMap } from './hash_map';
import { OcclusionManager } from './occlusion';
import { TOptional } from './util';
import { ASSERT } from './util/error_util';
import { Vector3 } from './vector';
import { RenderVoxelMeshParams, VoxeliseParams } from './worker_types';

export interface Voxel {
    position: Vector3;
    colour: RGBA;
    collisions: number;
}

export type TVoxelOverlapRule = 'first' | 'average';

export type TVoxelMeshParams = Pick<VoxeliseParams.Input, 'voxelOverlapRule' | 'enableAmbientOcclusion'>;

export class VoxelMesh {
    private _voxels: (Voxel & { collisions: number })[];
    private _voxelsHash: HashMap<Vector3, number>;
    private _bounds: Bounds;
    private _neighbourMap: Map<string, { value: number }>;
    private _voxelMeshParams: TVoxelMeshParams;

    public constructor(voxelMeshParams: TVoxelMeshParams) {
        this._voxels = [];
        this._voxelsHash = new HashMap(2048);
        this._neighbourMap = new Map();
        this._bounds = Bounds.getInfiniteBounds();
        this._voxelMeshParams = voxelMeshParams;
        this._recreateBuffer = true;
    }

    public getVoxels() {
        return this._voxels;
    }

    public isVoxelAt(pos: Vector3) {
        return this._voxelsHash.has(pos);
    }

    public getVoxelAt(pos: Vector3): TOptional<Voxel> {
        const voxelIndex = this._voxelsHash.get(pos);
        if (voxelIndex !== undefined) {
            return this._voxels[voxelIndex];
        }
    }

    public addVoxel(pos: Vector3, colour: RGBA) {
        if (colour.a === 0) {
            return;
        }

        pos.round();

        const voxelIndex = this._voxelsHash.get(pos);
        if (voxelIndex !== undefined) {
            // A voxel at this position already exists
            const voxel = this._voxels[voxelIndex];
            voxel.colour.r = ((voxel.colour.r * voxel.collisions) + colour.r) / (voxel.collisions + 1);
            voxel.colour.g = ((voxel.colour.g * voxel.collisions) + colour.g) / (voxel.collisions + 1);
            voxel.colour.b = ((voxel.colour.b * voxel.collisions) + colour.b) / (voxel.collisions + 1);
            voxel.colour.a = ((voxel.colour.a * voxel.collisions) + colour.a) / (voxel.collisions + 1);
            ++voxel.collisions;
        } else {
            // This is a new voxel
            this._voxels.push({
                position: pos,
                colour: colour,
                collisions: 1,
            });
            this._voxelsHash.add(pos, this._voxels.length - 1);
            this._bounds.extendByPoint(pos);
            this._updateNeighbours(pos);
        }
    }

    public getBounds() {
        return this._bounds;
    }

    public getVoxelCount() {
        return this._voxels.length;
    }

    private _neighbours = [
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
    ];

    private _updateNeighbours(pos: Vector3) {
        if (this._voxelMeshParams.enableAmbientOcclusion) {
            for (const neighbourOffset of this._neighbours) {
                const neighbour = Vector3.add(pos, neighbourOffset);
                const inverseOffset = neighbourOffset.copy().negate();
                const inverseIndex = OcclusionManager.getNeighbourIndex(inverseOffset);
                // ASSERT(inverseIndex >= 0 && inverseIndex < 27);
                const neighbourData = this.getNeighbours(neighbour);
                neighbourData.value |= (1 << inverseIndex);
                // ASSERT((this.getNeighbours(neighbour).value & (1 << inverseIndex)) !== 0);
            }
        }
    }

    private _stringified: string = '';
    public getNeighbours(pos: Vector3) {
        ASSERT(this._voxelMeshParams.enableAmbientOcclusion, 'Ambient occlusion is disabled');

        this._stringified = pos.stringify();
        const neighbours = this._neighbourMap.get(this._stringified);
        if (neighbours === undefined) {
            this._neighbourMap.set(this._stringified, { value: 0 });
            return this._neighbourMap.get(this._stringified)!;
        } else {
            return neighbours;
        }
    }

    public getNeighbourhoodMap() {
        return this._neighbourMap;
    }

    /*
     * Returns true if a voxel at position 'pos' has a neighbour with offset 'offset'
     * Offset must be a vector that exists within this._neighbours defined above
     */
    public hasNeighbour(pos: Vector3, offset: Vector3): boolean {
        return (this.getNeighbours(pos).value & (1 << OcclusionManager.getNeighbourIndex(offset))) > 0;
    }

    private _renderParams?: RenderVoxelMeshParams.Input;
    private _recreateBuffer: boolean;
    public setRenderParams(params: RenderVoxelMeshParams.Input) {
        this._renderParams = params;
        this._recreateBuffer = true;
    }

    private _buffer?: TVoxelMeshBufferDescription;
    public getBuffer(): TVoxelMeshBufferDescription {
        ASSERT(this._renderParams, 'Called VoxelMesh.getBuffer() without setting render params');
        if (this._buffer === undefined || this._recreateBuffer) {
            this._buffer = BufferGenerator.fromVoxelMesh(this, this._renderParams);
            this._recreateBuffer = false;
        }
        return this._buffer;
    }
}
