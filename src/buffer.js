const twgl = require('twgl.js');

class SegmentedBuffer {

    constructor(bufferSize, attributes) {
        this._bufferSize = bufferSize;
        this._completeBuffers = [];

        this._compiled = false;
        this.compiledBuffers = [];

        this._attributes = {};
        for (const attr of attributes) {
            this._attributes[attr.name] = {
                numComponents: attr.numComponents
            };
        }

        this._insertIndex = 0;
        this._maxIndex = 0;

        this._getNewBuffer();
    }

    _getNewBuffer() {
        this._buffer = {
            indices: {
                numComponents: 1,
                data: new Uint16Array(this._bufferSize),
            }
        };
        for (const attr in this._attributes) {
            this._buffer[attr] = {
                numComponents: this._attributes[attr].numComponents,
                data: new Float32Array(this._bufferSize * this._attributes[attr].numComponents)
            };
        }
    }

    _cycle() {

        this._completeBuffers.push({
            buffer: this._buffer,
            numElements: this._insertIndex,
        });
        this._getNewBuffer();
        this._maxIndex = 0;
        this._insertIndex = 0;
    }

    _willOverflow(data) {
        // Check for indices Uint16 overflow
        const dataMaxIndex = Math.max(...data.indices);
        let willOverflow = (this._maxIndex + dataMaxIndex) > 65535;
        if ((this._maxIndex + dataMaxIndex) > 65535) {
            console.log("index overflow");
        }

        const sizeAdding = data.indices.length;
        willOverflow |= (this._insertIndex + sizeAdding > this._bufferSize);
        if (this._insertIndex + sizeAdding > this._bufferSize) {
            console.log("length overflow");
        }

        if (sizeAdding > this._bufferSize) {
            throw "Data length too large, add in chunks smaller than buffer size";
        }

        return willOverflow;
    }

    _checkDataMatchesAttributes(data) {
        if (!('indices'in data)) {
            throw `Given data does not have indices data`;
        }
        const setsRequired = Math.max(...data.indices) + 1;
        for (const attr in this._attributes) {
            if (!(attr in data)) {
                throw `Given data does not have ${attr} data`;
            }
            if (data[attr].length % this._attributes[attr].numComponents != 0) {
                throw `Not enough/too much ${attr} data given`;
            }
            const numSets = data[attr].length / this._attributes[attr].numComponents;
            if (numSets != setsRequired) {
                //throw `Number of indices does not match number of ${attr} components given`;
                throw `Expected ${setsRequired * this._attributes[attr].numComponents} values for ${attr}, got ${data[attr].length}`;
            }
        }
    }

    _addDataToAttribute(attr, attr_data) {
        const indexOffset = this._insertIndex * this._attributes[attr].numComponents;
        for (let i = 0; i < attr_data.length; ++i) {
            this._buffer[attr].data[i + indexOffset] = attr_data[i];
        }
    }

    add(data) {
        this._checkDataMatchesAttributes(data);

        if (this._willOverflow(data)) {
            this._cycle();
        }

        if (this._compiled) {
            throw "Buffer already compiled, cannot add more data";
        }

        for (let i = 0; i < data.indices.length; ++i) {
            this._buffer.indices.data[i + this._insertIndex] = data.indices[i] + this._maxIndex;
        }
        //this._insertIndex += data.indices.length;
        const dataMaxIndex = Math.max(...data.indices);
        this._maxIndex += 1 + dataMaxIndex;
        
        for (const attr in this._attributes) {
            this._addDataToAttribute(attr, data[attr]);
        }
        this._insertIndex += data.indices.length;
    }

    compile(gl) {
        if (this._compiled) {
            return;
        }

        this._cycle();

        this.compiledBuffers = new Array(this._completeBuffers.length);
        for (let i = 0; i < this._completeBuffers.length; ++i) {
            this.compiledBuffers[i] = {
                buffer: twgl.createBufferInfoFromArrays(gl, this._completeBuffers[i].buffer),
                numElements: this._completeBuffers[i].numElements
            };
        }

        this._compiled = true;
    }

}

module.exports.SegmentedBuffer = SegmentedBuffer;
