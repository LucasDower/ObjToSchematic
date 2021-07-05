const { Vector3 } = require('./vector.js');
const { VoxelManager } = require('./voxel_manager.js');

class HashSet {
    
    constructor(numBins) {
        this.numBins = numBins;
        this.bins = new Array(numBins);
    }

    _getBin(key) {
        const hash = key.hash(); // A bit naughty
        return Math.abs(hash) % this.numBins;
    }

    add(key) {
        const binIndex = this._getBin(key);

        if (!this.bins[binIndex]) {
            this.bins[binIndex] = [ key ];
        } else {
            this.bins[binIndex].push(key);
        }
    }

    contains(key) {
        const binIndex = this._getBin(key);

        if (!this.bins[binIndex]) {
            return false;
        }

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