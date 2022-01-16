import * as twgl from 'twgl.js';

/*
    WebGL buffers store vertex index data as Uint16 and will lead to frequent overflows.
    SegmentedBuffer automatically partitions buffers to avoid overflows and removes the
    overhead of .push/.concat when adding data
*/

interface Attribute {
    name: string,
    numComponents: number
}

interface IndexedAttributed extends Attribute {
    insertIndex: number
}

interface CompleteBuffer {
    buffer: (SegmentedBufferData | BottomlessBufferData),
    numElements: number,
}

interface SegmentedBufferData {
    indices: SegmentedAttributeData,
    [name: string]: SegmentedAttributeData
}

interface BottomlessBufferData {
    indices: BottomlessAttributeData,
    [name: string]: BottomlessAttributeData
}

interface SegmentedAttributeData {
    numComponents: number,
    data: (Uint16Array | Float32Array)
}

interface BottomlessAttributeData {
    numComponents: number,
    data: Array<number>
}

export interface VoxelData {
    indices: Uint16Array
    [name: string]: (Uint16Array | Float32Array | Array<number>)
}

export class SegmentedBuffer {
    public WebGLBuffers: Array<{
        buffer: twgl.BufferInfo,
        numElements: number
    }>;

    private _bufferSize: number;
    private _completeBuffers: Array<CompleteBuffer>;
    private _buffer!: SegmentedBufferData;
    private _attributes: {[name: string]: IndexedAttributed};
    private _indicesInsertIndex: number = 0;
    private _maxIndex: number = 0;
    private _compiled: boolean = false;
    private _sanityCheck: boolean = false;

    constructor(bufferSize: number, attributes: Array<IndexedAttributed>) {
        this._bufferSize = bufferSize;
        this._completeBuffers = [];
        this.WebGLBuffers = [];

        this._attributes = {};
        for (const attr of attributes) {
            this._attributes[attr.name] = {
                name: attr.name,
                numComponents: attr.numComponents,
                insertIndex: 0,
            };
        }

        this._getNewBuffer();
    }

    private _getNewBuffer() {
        this._buffer = {
            indices: {
                numComponents: 1,
                data: new Uint16Array(this._bufferSize),
            },
        };
        for (const attr in this._attributes) {
            this._buffer[attr] = {
                numComponents: this._attributes[attr].numComponents,
                data: new Float32Array(this._bufferSize),
            };
            this._attributes[attr].insertIndex = 0;
        }
    }

    private _cycle() {
        this._completeBuffers.push({
            buffer: this._buffer,
            numElements: this._indicesInsertIndex,
        });
        this._getNewBuffer();

        this._indicesInsertIndex = 0;
        this._maxIndex = 0;
    }

    private _willOverflow(data: VoxelData): boolean {
        // Check for indices Uint16 overflow
        // const dataMaxIndex = Math.max(...data.indices);
        const dataMaxIndex = data.indices.reduce((a, v) => Math.max(a, v));
        if ((this._maxIndex + dataMaxIndex) > 65535) {
            return true;
        }

        for (const attr in this._attributes) {
            if (this._sanityCheck && data[attr].length > this._bufferSize) {
                // TODO: Automatically partition into smaller segments
                throw Error(`Data for ${attr} does not fit within the buffer.`);
            }
            if (data[attr].length + this._attributes[attr].insertIndex > this._bufferSize) {
                return true;
            }
        }

        return false;
    }

    private _checkDataMatchesAttributes(data: VoxelData) {
        /*
        if (!('indices' in data)) {
            throw `Given data does not have indices data`;
        }
        */
        // const setsRequired = Math.max(...data.indices) + 1;
        const setsRequired = data.indices.reduce((a, v) => Math.max(a, v)) + 1;
        for (const attr in this._attributes) {
            if (!(attr in data)) {
                throw Error(`Given data does not have ${attr} data`);
            }
            if (data[attr].length % this._attributes[attr].numComponents != 0) {
                throw Error(`Not enough/too much ${attr} data given`);
            }
            const numSets = data[attr].length / this._attributes[attr].numComponents;
            if (numSets != setsRequired) {
                // throw `Number of indices does not match number of ${attr} components given`;
                throw Error(`Expected ${setsRequired * this._attributes[attr].numComponents} values for ${attr}, got ${data[attr].length}`);
            }
        }
    }

    private _addDataToAttribute(attr: string, attrData: (Uint16Array | Float32Array | Array<number>)) {
        const indexOffset = this._attributes[attr].insertIndex;
        attrData.forEach((value, i) => {
            this._buffer[attr].data[i + indexOffset] = value;
        });
        this._attributes[attr].insertIndex += attrData.length;
    }

    public add(data: VoxelData) {
        if (this._compiled) {
            throw Error('Buffer already compiled, cannot add more data');
        }

        if (this._sanityCheck) {
            this._checkDataMatchesAttributes(data);
        }

        if (this._willOverflow(data)) {
            // console.log("Cycling buffer...");
            this._cycle();
        }

        // Add the new indices data
        data.indices.forEach((indexData, i) => {
            this._buffer.indices.data[i + this._indicesInsertIndex] = indexData + this._maxIndex;
        });

        this._indicesInsertIndex += data.indices.length;
        this._maxIndex += 1 + data.indices.reduce((a, v) => Math.max(a, v));

        for (const attr in this._attributes) {
            this._addDataToAttribute(attr, data[attr]);
        }
    }


    public compile(gl: WebGLRenderingContext) {
        if (this._compiled) {
            return;
        }

        this._cycle();

        this.WebGLBuffers = new Array(this._completeBuffers.length);

        this._completeBuffers.forEach((buffer, i) => {
            this.WebGLBuffers[i] = {
                buffer: twgl.createBufferInfoFromArrays(gl, buffer.buffer),
                numElements: buffer.numElements,
            };
        });

        this._compiled = true;
    }
}


export class BottomlessBuffer {
    public WebGLBuffers: Array<{
        buffer: twgl.BufferInfo,
        numElements: number
    }>;

    private _completeBuffers: Array<CompleteBuffer>;
    private _buffer!: BottomlessBufferData;
    private _attributes: {[name: string]: Attribute};
    private _maxIndex: number = 0;
    private _compiled: boolean = false;
    private _sanityCheck: boolean = true;

    constructor(attributes: Array<Attribute>) {
        this._completeBuffers = [];

        this._compiled = false;
        this.WebGLBuffers = [];

        this._attributes = {};
        for (const attr of attributes) {
            this._attributes[attr.name] = {
                name: attr.name,
                numComponents: attr.numComponents,
            };
        }

        this._maxIndex = 0;
        this._sanityCheck = true;

        this._getNewBuffer();
    }

    _getNewBuffer() {
        this._buffer = {
            indices: {numComponents: 1, data: []},
        };
        for (const attr in this._attributes) {
            this._buffer[attr] = {
                numComponents: this._attributes[attr].numComponents,
                data: [],
            };
        }
    }

    _cycle() {
        this._completeBuffers.push({
            buffer: this._buffer,
            numElements: this._buffer.indices.data.length,
        });
        this._getNewBuffer();

        this._maxIndex = 0;
    }

    _willOverflow(data: VoxelData) {
        // Check for indices Uint16 overflow
        // const dataMaxIndex = Math.max(...data.indices);
        const dataMaxIndex = data.indices.reduce((a, v) => Math.max(a, v));
        return ((this._maxIndex + dataMaxIndex) > 65535);
    }

    _checkDataMatchesAttributes(data: VoxelData) {
        if (!('indices' in data)) {
            throw Error('Given data does not have indices data');
        }
        const setsRequired = data.indices.reduce((a, v) => Math.max(a, v)) + 1;
        for (const attr in this._attributes) {
            if (!(attr in data)) {
                throw Error(`Given data does not have ${attr} data`);
            }
            if (data[attr].length % this._attributes[attr].numComponents != 0) {
                throw Error(`Not enough/too much ${attr} data given`);
            }
            const numSets = data[attr].length / this._attributes[attr].numComponents;
            if (numSets != setsRequired) {
                // throw `Number of indices does not match number of ${attr} components given`;
                throw Error(`Expected ${setsRequired * this._attributes[attr].numComponents} values for ${attr}, got ${data[attr].length}`);
            }
        }
    }


    add(data: VoxelData) {
        if (this._compiled) {
            throw Error('Buffer already compiled, cannot add more data');
        }

        if (this._sanityCheck) {
            this._checkDataMatchesAttributes(data);
        }

        if (this._willOverflow(data)) {
            // console.log("Cycling buffer...");
            this._cycle();
        }

        // Add the new indices data
        data.indices.forEach((index) => {
            this._buffer.indices.data.push(index + this._maxIndex);
        });
        this._maxIndex += 1 + data.indices.reduce((a, v) => Math.max(a, v));

        for (const attr in this._attributes) {
            data[attr].forEach((v) => {
                this._buffer[attr].data.push(v);
            });
        }
    }

    compile(gl: WebGLRenderingContext) {
        if (this._compiled) {
            return;
        }

        this._cycle();

        this.WebGLBuffers = new Array(this._completeBuffers.length);

        this._completeBuffers.forEach((buffer, i) => {
            this.WebGLBuffers[i] = {
                buffer: twgl.createBufferInfoFromArrays(gl, buffer.buffer),
                numElements: buffer.numElements,
            };
        });

        this._compiled = true;
    }
}
