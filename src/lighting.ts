import { BlockMesh } from './block_mesh';
import { ASSERT } from './util/error_util';
import { Vector3Hash } from './util/type_util';
import { Vector3 } from './vector';

export type TLightLevel = { blockLightValue: number, sunLightValue: number };
export type TLightUpdate = TLightLevel & { pos: Vector3 };

export class BlockMeshLighting {
    private _owner: BlockMesh;

    private _sunLightValues: Map<Vector3Hash, number>;
    private _blockLightValues: Map<Vector3Hash, number>;

    public constructor(owner: BlockMesh) {
        this._owner = owner;
        this._sunLightValues = new Map();
        this._blockLightValues = new Map();
    }

    public getLightLevel(vec: Vector3): TLightLevel {
        const hash = vec.hash();
        return {
            sunLightValue: this._sunLightValues.get(hash) ?? 0,
            blockLightValue: this._blockLightValues.get(hash) ?? 0,
        };
    }

    public getMaxLightLevel(vec: Vector3): number {
        const light = this.getLightLevel(vec);
        //return light.blockLightValue;
        //return light.sunLightValue;
        return Math.max(light.blockLightValue, light.sunLightValue);
    }

    public addLightToDarkness(threshold: number) {
        if (threshold === 0) {
            return;
        }

        const potentialBlocks: Vector3[] = [];
        this._owner.getBlocks().forEach((block) => {
            if (this.getMaxLightLevel(block.voxel.position) < threshold) {
                potentialBlocks.push(block.voxel.position);
            }
        });

        while (potentialBlocks.length > 0) {
            const potentialBlockPos = potentialBlocks.pop()!;

            if (this.getMaxLightLevel(potentialBlockPos) < threshold) {
                const success = this._owner.setEmissiveBlock(potentialBlockPos);

                if (success) {
                    const newBlockLight = 14; // TODO: Not necessarily 14
                    this._blockLightValues.set(potentialBlockPos.hash(), newBlockLight);

                    const attenuated: TLightLevel = {
                        sunLightValue: this.getLightLevel(potentialBlockPos).sunLightValue - 1,
                        blockLightValue: newBlockLight - 1,
                    };
                    const updates: TLightUpdate[] = [];
                    updates.push({ pos: new Vector3(0, 1, 0).add(potentialBlockPos), ...attenuated });
                    updates.push({ pos: new Vector3(1, 0, 0).add(potentialBlockPos), ...attenuated });
                    updates.push({ pos: new Vector3(0, 0, 1).add(potentialBlockPos), ...attenuated });
                    updates.push({ pos: new Vector3(-1, 0, 0).add(potentialBlockPos), ...attenuated });
                    updates.push({ pos: new Vector3(0, 0, -1).add(potentialBlockPos), ...attenuated });
                    updates.push({ pos: new Vector3(0, -1, 0).add(potentialBlockPos), ...attenuated });
                    this._handleUpdates(updates);
                    ASSERT(updates.length === 0);
                }
            }
        }
    }

    public addSunLightValues() {
        // Calculate the highest block in each column.
        const plane = new Map<number, { x: number, z: number }>();
        this._owner.getBlocks().forEach((block) => {
            const pos = block.voxel.position.copy();
            pos.y = 0;
            plane.set(pos.hash(), pos);
        });

        const maxHeight = this._owner.getVoxelMesh().getBounds().max.y;

        // Actually commit the light level changes.
        const updates: TLightUpdate[] = [];
        plane.forEach((value, key) => {
            updates.push({
                pos: new Vector3(value.x, maxHeight, value.z),
                sunLightValue: 15,
                blockLightValue: 0,
            });
        });
        this._handleUpdates(updates);
        ASSERT(updates.length === 0, 'Updates still remaining');
    }

    public addEmissiveBlocks() {
        const updates: TLightUpdate[] = [];
        this._owner.getBlocks().forEach((block) => {
            if (this._owner.isEmissiveBlock(block)) {
                updates.push({
                    pos: block.voxel.position,
                    sunLightValue: 0,
                    blockLightValue: 14,
                });
            }
        });
        this._handleUpdates(updates);
        ASSERT(updates.length === 0, 'Updates still remaining');
    }

    /**
     * Goes through each block location in `updates` and sets the light value
     * to the maximum of its current value and its update value.
     *
     * @Note **Modifies `updates`**
     */
    private _handleUpdates(updates: TLightUpdate[]) {
        while (updates.length > 0) {
            const update = updates.pop()!;

            // Only update light values inside the bounds of the block mesh.
            // Values outside the bounds are assumed to have sunLightValue of 15
            // and blockLightValue of 0.
            if (!this._isPosValid(update.pos)) {
                continue;
            }
            const current = this.getLightLevel(update.pos);
            const toSet: TLightLevel = { sunLightValue: current.sunLightValue, blockLightValue: current.blockLightValue };

            const blockHere = this._owner.getBlockAt(update.pos);
            const isBlockHere = blockHere !== undefined;
            const hash = update.pos.hash();

            // Update sunLight value
            if (current.sunLightValue < update.sunLightValue) {
                toSet.sunLightValue = update.sunLightValue;
                this._sunLightValues.set(hash, toSet.sunLightValue);
            }

            // Update blockLight values
            if (current.blockLightValue < update.blockLightValue) {
                toSet.blockLightValue = update.blockLightValue;
                this._blockLightValues.set(hash, toSet.blockLightValue);
            }

            const shouldPropagate = isBlockHere ?
                this._owner.isTransparentBlock(blockHere) :
                true;

            // Actually commit the light value changes and notify neighbours to
            // update their values.
            if (shouldPropagate) {
                const sunLightChanged = current.sunLightValue !== toSet.sunLightValue && toSet.sunLightValue > 0;
                const blockLightChanged = current.blockLightValue !== toSet.blockLightValue && toSet.blockLightValue > 0;
                if ((sunLightChanged || blockLightChanged)) {
                    const attenuated: TLightLevel = {
                        sunLightValue: toSet.sunLightValue - 1,
                        blockLightValue: toSet.blockLightValue - 1,
                    };
                    updates.push({ pos: new Vector3(0, 1, 0).add(update.pos), ...attenuated });
                    updates.push({ pos: new Vector3(1, 0, 0).add(update.pos), ...attenuated });
                    updates.push({ pos: new Vector3(0, 0, 1).add(update.pos), ...attenuated });
                    updates.push({ pos: new Vector3(-1, 0, 0).add(update.pos), ...attenuated });
                    updates.push({ pos: new Vector3(0, 0, -1).add(update.pos), ...attenuated });
                    updates.push({ pos: new Vector3(0, -1, 0).add(update.pos), sunLightValue: toSet.sunLightValue === 15 ? 15 : toSet.sunLightValue - 1, blockLightValue: toSet.blockLightValue - 1 });
                }
            }
        }
    }

    private _isPosValid(vec: Vector3) {
        const blocksBounds = this._owner.getVoxelMesh().getBounds(); // TODO: Cache
        const xValid = blocksBounds.min.x - 1 <= vec.x && vec.x <= blocksBounds.max.x + 1;
        const yValid = blocksBounds.min.y - 1 <= vec.y && vec.y <= blocksBounds.max.y + 1;
        const zValid = blocksBounds.min.z - 1 <= vec.z && vec.z <= blocksBounds.max.z + 1;
        return xValid && yValid && zValid;
    }
}
