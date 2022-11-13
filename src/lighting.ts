import { BlockMesh } from './block_mesh';
import { ASSERT } from './util/error_util';
import { LOG } from './util/log_util';
import { Vector3Hash } from './util/type_util';
import { Vector3 } from './vector';

export type TLightLevel = { blockLightValue: number, sunLightValue: number };
export type TLightUpdate = TLightLevel & { pos: Vector3 };

export class BlockMeshLighting {
    private _owner: BlockMesh;

    private _limits: Map<number, { x: number, z: number, minY: number, maxY: number }>;
    private _sunLightValues: Map<Vector3Hash, number>;
    private _blockLightValues: Map<Vector3Hash, number>;
    private _updates: number;
    private _skips: number;

    public constructor(owner: BlockMesh) {
        this._owner = owner;
        this._sunLightValues = new Map();
        this._blockLightValues = new Map();
        this._limits = new Map();

        this._updates = 0;
        this._skips = 0;
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

    private _calculateLimits() {
        this._limits.clear();

        const updateLimit = (pos: Vector3) => {
            const key = pos.copy();
            key.y = 0;

            const blockLimit = this._limits.get(key.hash());
            if (blockLimit !== undefined) {
                blockLimit.maxY = Math.max(blockLimit.maxY, pos.y);
                blockLimit.minY = Math.min(blockLimit.minY, pos.y);
            } else {
                this._limits.set(key.hash(), {
                    x: pos.x,
                    z: pos.z,
                    minY: pos.y,
                    maxY: pos.y,
                });
            }
        };

        this._owner.getBlocks().forEach((block) => {
            updateLimit(block.voxel.position);
            updateLimit(new Vector3(1, 0, 0).add(block.voxel.position));
            updateLimit(new Vector3(-1, 0, 0).add(block.voxel.position));
            updateLimit(new Vector3(0, 0, 1).add(block.voxel.position));
            updateLimit(new Vector3(0, 0, -1).add(block.voxel.position));
        });
    }

    public init() {
        this._calculateLimits();
    }

    public addSunLightValues() {
        // Actually commit the light level changes.
        const updates: TLightUpdate[] = [];
        this._limits.forEach((limit, key) => {
            updates.push({
                pos: new Vector3(0, 1, 0).add(new Vector3(limit.x, limit.maxY, limit.z)),
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
            this._updates += 1;
            const update = updates.pop()!;

            // Only update light values inside the bounds of the block mesh.
            // Values outside the bounds are assumed to have sunLightValue of 15
            // and blockLightValue of 0.
            if (!this._isPosValid(update.pos)) {
                this._skips += 1;
                continue;
            }
            const current = this.getLightLevel(update.pos);
            const toSet: TLightLevel = { sunLightValue: current.sunLightValue, blockLightValue: current.blockLightValue };

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

            const blockHere = this._owner.getBlockAt(update.pos);
            const isBlockHere = blockHere !== undefined;

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
                    updates.push({ pos: new Vector3(0, 1, 0).add(update.pos), sunLightValue: attenuated.sunLightValue, blockLightValue: attenuated.blockLightValue });
                    updates.push({ pos: new Vector3(1, 0, 0).add(update.pos), sunLightValue: attenuated.sunLightValue, blockLightValue: attenuated.blockLightValue });
                    updates.push({ pos: new Vector3(0, 0, 1).add(update.pos), sunLightValue: attenuated.sunLightValue, blockLightValue: attenuated.blockLightValue });
                    updates.push({ pos: new Vector3(-1, 0, 0).add(update.pos), sunLightValue: attenuated.sunLightValue, blockLightValue: attenuated.blockLightValue });
                    updates.push({ pos: new Vector3(0, 0, -1).add(update.pos), sunLightValue: attenuated.sunLightValue, blockLightValue: attenuated.blockLightValue });
                    updates.push({ pos: new Vector3(0, -1, 0).add(update.pos), sunLightValue: toSet.sunLightValue === 15 ? 15 : toSet.sunLightValue - 1, blockLightValue: toSet.blockLightValue - 1 });
                }
            }
        }
    }

    private _isPosValid(vec: Vector3) {
        const key = vec.copy();
        key.y = 0;

        const limit = this._limits.get(key.hash());
        if (limit !== undefined) {
            return vec.y >= limit.minY - 1 && vec.y <= limit.maxY + 1;
        } else {
            return false;
        }
    }

    public dumpInfo() {
        LOG(`Skipped ${this._skips} out of ${this._updates} (${(100 * this._skips / this._updates).toFixed(4)}%)`);
    }
}
