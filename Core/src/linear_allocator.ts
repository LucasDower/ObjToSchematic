export class LinearAllocator<T> {
    private _items: Array<T>;
    private _nextIndex: number;
    private _max: number;
    private _itemConstructor: () => T;

    public constructor(getNewItem: () => T) {
        this._items = new Array<T>();
        this._nextIndex = 0;
        this._max = 0;
        this._itemConstructor = getNewItem;
    }

    private _add(item: T) {
        this._items[this._nextIndex] = item;
        ++this._nextIndex;
        this._max = Math.max(this._max, this._nextIndex);
    }

    public reset() {
        this._nextIndex = 0;
    }

    public get(index: number): T | undefined {
        return this._items[index];
    }

    public size() {
        return this._nextIndex;
    }

    public place(): T {
        if (this._nextIndex >= this._max) {
            //console.log('Adding new item at index', this._nextIndex);
            const newItem = this._itemConstructor();
            this._add(newItem);
            return newItem;
        } else {
            ++this._nextIndex;
            //console.log('Returning item at index', this._nextIndex - 1);
            return this._items[this._nextIndex - 1];
        }
    }

    public max() {
        return this._max;
    }
}
