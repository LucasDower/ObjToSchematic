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


class HashMap {

    constructor(numBins) {
        this.numBins = numBins;
        this.bins = new Array(numBins);
    }

    _getBin(key) {
        const hash = key.hash(); // A bit naughty
        return Math.abs(hash) % this.numBins;
    }

    add(key, value) {
        const binIndex = this._getBin(key);
        //console.log(binIndex);

        if (!this.bins[binIndex]) {
            this.bins[binIndex] = [ {key: key, value: value} ];
        } else {
            this.bins[binIndex].push({key: key, value: value});
        }
    }

    get(key) {
        const binIndex = this._getBin(key);

        if (!this.bins[binIndex]) {
            return;
        }

        const list = this.bins[binIndex];
        for (const item of list) {
            if (item.key.equals(key)) {
                return item.value;
            }
        }
    }
}

module.exports.HashSet = HashSet;
module.exports.HashMap = HashMap;