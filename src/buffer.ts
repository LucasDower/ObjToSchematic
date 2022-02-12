import { Renderer } from './renderer';

import * as twgl from 'twgl.js';
import { ASSERT } from './util';

interface Attribute {
    name: string,
    numComponents: number
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
    private _WebGLBuffer?: {
        buffer: twgl.BufferInfo,
        numElements: number
    };
    private _buffer!: BottomlessBufferData;
    private _attributes: {[name: string]: Attribute};
    private _maxIndex: number = 0;
    private _compiled: boolean = false;
    private _sanityCheck: boolean = false;

    public constructor(attributes: Array<Attribute>) {
        this._compiled = false;

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

    public add(data: VoxelData) {
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

    public attachNewAttribute(data: VoxelData) {

    }

    public removeAttribute(attribute: string) {

    }

    public getWebGLBuffer() {
        this._compile();
        ASSERT(this._WebGLBuffer !== undefined);
        return this._WebGLBuffer;
    }

    private _compile() {
        if (this._compiled) {
            return;
        }

        const newBuffer: { indices: { data: Uint32Array, numComponents: number }, [arr: string]: { data: (Float32Array | Uint32Array), numComponents: number }} = {
            indices: { data: Uint32Array.from(this._buffer.indices.data), numComponents: this._buffer.indices.numComponents },
        };
        for (const key in this._buffer) {
            if (key !== 'indices') {
                newBuffer[key] = {
                    data: Float32Array.from(this._buffer[key].data),
                    numComponents: this._buffer[key].numComponents,
                };
            }
        }

        this._WebGLBuffer = {
            buffer: twgl.createBufferInfoFromArrays(Renderer.Get._gl, newBuffer),
            numElements: this._buffer.indices.data.length,
        };

        this._compiled = true;
    }

    private _getNewBuffer() {
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

    private _checkDataMatchesAttributes(data: VoxelData) {
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
}
