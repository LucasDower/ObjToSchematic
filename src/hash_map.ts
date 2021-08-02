export abstract class Hashable {
    abstract hash(): number;
    abstract equals(other: Hashable): boolean
}

export class HashSet<T extends Hashable> {
    
    private _numBins: number;
    protected _bins: Array<Array<T>>;

    constructor(numBins: number) {
        this._numBins = numBins;
        this._bins = new Array(numBins);

        for (let i = 0; i < numBins; ++i) {
            this._bins[i] = [];
        }
    }

    _getBin(key: T) {
        const hash = key.hash();
        return Math.abs(hash) % this._numBins;
    }

    add(key: T) {
        const binIndex = this._getBin(key);
        this._bins[binIndex].push(key);
    }

    contains(key: T) {
        const binIndex = this._getBin(key);

        const list = this._bins[binIndex];
        for (const item of list) {
            if (item.equals(key)) {
                return true;
            }
        }
        return false;
    }

}


export class HashMap<T extends Hashable> extends HashSet<T> {

    get(key: T): (T | undefined) {
        const binIndex = this._getBin(key);

        const list = this._bins[binIndex];
        for (const item of list) {
            if (item.equals(key)) {
                return item;
            }
        }
    }

}