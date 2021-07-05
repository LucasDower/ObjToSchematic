const { Vector3 } = require('./vector.js');

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

/*
const hashMap = new HashMap(4);
const v = new Vector3(2.0, 2.0, 3.0);
const v2 = new Vector3(2.0, 2.0, 5.0);
const v3 = new Vector3(-2.0, -2.0, -5.0);
const v4 = new Vector3(-2.0, -5.0, -7.0);

hashMap.add(v, true);
hashMap.add(v2, true);
hashMap.add(v3, true);

console.log(hashMap.bins[0]);
console.log(hashMap.bins[1]);
console.log(hashMap.bins[2]);
console.log(hashMap.bins[3]);

console.log(hashMap.get(v));
console.log(hashMap.get(v2));
console.log(hashMap.get(v3));
console.log(hashMap.get(v4));
*/

module.exports.HashMap = HashMap;
module.exports.HashSet = HashSet;