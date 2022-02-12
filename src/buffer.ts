import * as twgl from 'twgl.js';

interface Attribute {
    name: string,
    numComponents: number
}

interface CompleteBuffer {
    buffer: BottomlessBufferData,
    numElements: number,
}

interface BottomlessBufferData {
    indices: BottomlessAttributeData,
    [name: string]: BottomlessAttributeData
}
interface BottomlessAttributeData {
    numComponents: number,
    data: Array<number>
}

export interface VoxelData {
    indices: Uint32Array
    custom: {
        [name: string]: Array<number>
    }
}

export class RenderBuffer {
    public WebGLBuffers: Array<{
        buffer: twgl.BufferInfo,
        numElements: number
    }>;

    private _completeBuffers: Array<CompleteBuffer>;
    private _buffer!: BottomlessBufferData;
    private _attributes: {[name: string]: Attribute};
    private _maxIndex: number = 0;
    private _compiled: boolean = false;
    private _sanityCheck: boolean = false;

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
        // console.log('Cycle');

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
            if (data.custom[attr].length % this._attributes[attr].numComponents != 0) {
                throw Error(`Not enough/too much ${attr} data given`);
            }
            const numSets = data.custom[attr].length / this._attributes[attr].numComponents;
            if (numSets != setsRequired) {
                // throw `Number of indices does not match number of ${attr} components given`;
                throw Error(`Expected ${setsRequired * this._attributes[attr].numComponents} values for ${attr}, got ${data.custom[attr].length}`);
            }
        }
    }

    add(data: VoxelData) {
        /*
        if (this._willOverflow(data)) {
            this._cycle();
        }
        */
        if (this._sanityCheck) {
            this._checkDataMatchesAttributes(data);
        }

        const mappedIndicesToAdd = new Array<number>(data.indices.length);
        let maxMapped = -1;
        data.indices.forEach((index, i) => {
            const newIndex = index + this._maxIndex;
            maxMapped = Math.max(maxMapped, newIndex);
            mappedIndicesToAdd[i] = newIndex;
        });
        this._buffer.indices.data.push(...mappedIndicesToAdd);
        this._maxIndex = 1 + maxMapped;

        for (const attr in this._attributes) {
            this._buffer[attr].data.push(...data.custom[attr]);
        }
    }

    compile(gl: WebGLRenderingContext) {
        if (this._compiled) {
            return;
        }

        this._cycle();

        this.WebGLBuffers = new Array(this._completeBuffers.length);

        this._completeBuffers.forEach((buffer, i) => {
            const newBuffer : { indices: { data: Uint32Array, numComponents: number }, [arr: string]: { data: (Float32Array | Uint32Array), numComponents: number }} = {
                indices: { data: Uint32Array.from(buffer.buffer.indices.data), numComponents: buffer.buffer.indices.numComponents },
            };
            for (const key in buffer.buffer) {
                if (key !== 'indices') {
                    newBuffer[key] = {
                        data: Float32Array.from(buffer.buffer[key].data),
                        numComponents: buffer.buffer[key].numComponents,
                    };
                }
            }
            this.WebGLBuffers[i] = {
                buffer: twgl.createBufferInfoFromArrays(gl, newBuffer),
                numElements: buffer.numElements,
            };
        });

        this._compiled = true;
    }
}
