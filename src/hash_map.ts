export interface IHashable {
    hash(): number;
    equals(other: IHashable): boolean;
}

export class HashSet<T extends IHashable> {
    private _numBins: number;
    protected _bins: Array<Array<T>>;

    constructor(numBins: number) {
        this._numBins = numBins;
        this._bins = new Array(numBins);

        for (let i = 0; i < numBins; ++i) {
            this._bins[i] = [];
        }
    }

    protected _getBin(key: T) {
        const hash = key.hash();
        return Math.abs(hash) % this._numBins;
    }

    public add(key: T) {
        const binIndex = this._getBin(key);
        this._bins[binIndex].push(key);
    }

    public contains(key: T) {
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


export class HashMap<K extends IHashable, V> {
    private _numBins: number;
    protected _bins: Array<Array<{key: K, value: V}>>;

    constructor(numBins: number) {
        this._numBins = numBins;
        this._bins = new Array(numBins);

        for (let i = 0; i < numBins; ++i) {
            this._bins[i] = [];
        }
    }

    protected _getBin(key: K) {
        const hash = key.hash();
        return Math.abs(hash) % this._numBins;
    }

    public get(item: K): (V | undefined) {
        const binIndex = this._getBin(item);

        const list = this._bins[binIndex];
        for (const {key, value} of list) {
            if (item.equals(key)) {
                return value;
            }
        }
    }

    /* eslint-disable */
    public has(item: K): boolean {
        const binIndex = this._getBin(item);

        const list = this._bins[binIndex];
        for (const { key, value } of list) { 
            if (item.equals(key)) {
                return true;
            }
        }

        return false;
    }
    /* eslint-enable */

    public add(key: K, value: V) {
        const binIndex = this._getBin(key);
        this._bins[binIndex].push({key, value});
    }
}
