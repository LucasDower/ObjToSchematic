const { Vector3 } = require('./vector.js');
const { VoxelManager } = require('./voxel_manager.js');

class HashSet {
    
    constructor(numBins) {
        this.numBins = numBins;
        this.bins = new Array(numBins);
        for (let i = 0; i < numBins; ++i) {
            this.bins[i] = [];
        }
    }

    _getBin(key) {
        const hash = key.hash(); // A bit naughty
        return Math.abs(hash) % this.numBins;
    }

    add(key) {
        const binIndex = this._getBin(key);
        this.bins[binIndex].push(key);
    }

    contains(key) {
        const binIndex = this._getBin(key);

        const list = this.bins[binIndex];
        for (const item of list) {
            if (item.equals(key)) {
                return true;
            }
        }
        return false;
    }
}

module.exports.HashSet = HashSet;