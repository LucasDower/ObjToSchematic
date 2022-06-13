import { Renderer } from './renderer';
import { ASSERT } from './util';

import * as twgl from 'twgl.js';

export interface Attribute {
    name: string,
    numComponents: number
}

export interface RenderBufferData {
    indices: RenderBufferAttributeData,
    [name: string]: RenderBufferAttributeData
}

export interface RenderBufferAttributeData {
    numComponents: number,
    data: Array<number>
}

export interface AttributeData {
    indices: Uint32Array
    custom: {
        [name: string]: Array<number>
    }
}

export function MergeAttributeData(...data: AttributeData[]): AttributeData {
    if (data.length === 0) {
        return {
            indices: new Uint32Array(),
            custom: {},
        };
    }
    // Check custom attributes match
    const requiredAttributes = Object.keys(data[0].custom);
    for (let i = 1; i < data.length; ++i) {
        const customAttributes = Object.keys(data[i].custom);
        const isAllRequiredInCustom = requiredAttributes.every((attr) => {
            return customAttributes.includes(attr);
        });
        const isAllCustomInRequired = customAttributes.every((attr) => {
            return requiredAttributes.includes(attr);
        });
        ASSERT(isAllRequiredInCustom && isAllCustomInRequired, 'Attributes to merge do not match');
    }
    // Merge data
    const indices = Array.from(data[0].indices);
    const custom = data[0].custom;
    for (let i = 1; i < data.length; ++i) {
        const nextIndex = Math.max(...indices) + 1;
        const d = data[i];
        const newIndices = d.indices.map((index) => index + nextIndex);
        indices.push(...Array.from(newIndices));
        for (const attr of requiredAttributes) {
            const attrData = d.custom[attr];
            custom[attr].push(...attrData);
        }
    }

    return {
        indices: new Uint32Array(indices),
        custom: custom,
    };
}

export class RenderBuffer {
    private _WebGLBuffer?: {
        buffer: twgl.BufferInfo,
        numElements: number
    };
    private _buffer!: RenderBufferData;
    private _attributes: {[name: string]: Attribute};
    public _maxIndex: number;
    private _compiled: boolean;
    private _needsCompiling: boolean;

    public constructor(attributes: Array<Attribute>) {
        this._attributes = {};
        for (const attr of attributes) {
            this._attributes[attr.name] = {
                name: attr.name,
                numComponents: attr.numComponents,
            };
        }
        
        this._needsCompiling = false;
        this._compiled = false;
        this._maxIndex = 0;

        this._getNewBuffer();
    }

    public add(data: AttributeData) {
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

        this._needsCompiling = true;
    }

    public getAttribute(attributeName: string) {
        if (attributeName in this._buffer) {
            return this._buffer[attributeName].data;
        }
    }

    public attachNewAttribute(attribute: Attribute, data: Array<number>) {
        ASSERT(this._buffer[attribute.name] === undefined, 'Attribute already exists in buffer');
        ASSERT(this._attributes[attribute.name] === undefined, 'Attribute already exists in attributes');
        const expectedDataLength = this._maxIndex * attribute.numComponents;
        ASSERT(data.length === expectedDataLength, `Data length expected to be ${expectedDataLength}, got ${data.length}`);
        this._buffer[attribute.name] = {
            numComponents: attribute.numComponents,
            data: data,
        };
        this._attributes[attribute.name] = attribute;
        this._needsCompiling = true;
    }

    public removeAttribute(attributeName: string) {
        delete this._buffer[attributeName];
        delete this._attributes[attributeName];
        this._needsCompiling = true;
    }

    public getWebGLBuffer() {
        this._compile();
        ASSERT(this._WebGLBuffer !== undefined);
        return this._WebGLBuffer;
    }

    private _compile() {
        if (this._compiled && !this._needsCompiling) {
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
        this._needsCompiling = false;
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

    private _checkDataMatchesAttributes(data: AttributeData) {
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

    public copy(): RenderBuffer {
        const copiedBuffer = new RenderBuffer([]);

        copiedBuffer._buffer = {
            indices: {
                numComponents: this._buffer.indices.numComponents,
                data: Array.from(this._buffer.indices.data),
            },
        };
        for (const key in this._buffer) {
            if (key !== 'indices') {
                copiedBuffer._buffer[key] = {
                    numComponents: this._buffer[key].numComponents,
                    data: Array.from(this._buffer[key].data),
                };
            }
        }

        copiedBuffer._attributes = JSON.parse(JSON.stringify(this._attributes));
        copiedBuffer._maxIndex = this._maxIndex;
        copiedBuffer._compiled = false;
        copiedBuffer._needsCompiling = true;
        return copiedBuffer;
    }
}
