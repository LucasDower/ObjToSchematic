const twgl = require('twgl.js');

/*
    WebGL buffers store vertex index data as Uint16 and will lead to frequent overflows.
    SegmentedBuffer automatically partitions buffers to avoid overflows and removes the 
    overhead of .push/.concat when adding data
*/
class SegmentedBuffer {

    constructor(bufferSize, attributes) {
        this._bufferSize = bufferSize;
        this._completeBuffers = [];

        this._compiled = false;
        this.WebGLBuffers = [];

        this._attributes = {};
        for (const attr of attributes) {
            this._attributes[attr.name] = {
                numComponents: attr.numComponents,
                insertIndex: 0
            };
        }

        this._indicesInsertIndex = 0;
        this._maxIndex = 0;

        this._sanityCheck = false;

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
                data: new Float32Array(this._bufferSize)
            };
            this._attributes[attr].insertIndex = 0;
        }
    }

    _cycle() {
        this._completeBuffers.push({
            buffer: this._buffer,
            numElements: this._indicesInsertIndex,
        });
        this._getNewBuffer();

        this._indicesInsertIndex = 0;
        this._maxIndex = 0;
    }

    _willOverflow(data) {
        // Check for indices Uint16 overflow
        const dataMaxIndex = Math.max(...data.indices);
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

    _checkDataMatchesAttributes(data) {
        if (!('indices'in data)) {
            throw `Given data does not have indices data`;
        }
        const setsRequired = Math.max(...data.indices) + 1;
        for (const attr in this._attributes) {
            if (!(attr in data)) {
                throw Error(`Given data does not have ${attr} data`);
            }
            if (data[attr].length % this._attributes[attr].numComponents != 0) {
                throw Error(`Not enough/too much ${attr} data given`);
            }
            const numSets = data[attr].length / this._attributes[attr].numComponents;
            if (numSets != setsRequired) {
                //throw `Number of indices does not match number of ${attr} components given`;
                throw Error(`Expected ${setsRequired * this._attributes[attr].numComponents} values for ${attr}, got ${data[attr].length}`);
            }
        }
    }

    _addDataToAttribute(attr, attr_data) {
        const indexOffset = this._attributes[attr].insertIndex;
        attr_data.forEach((value, i) => {
            this._buffer[attr].data[i + indexOffset] = value;
        });
        this._attributes[attr].insertIndex += attr_data.length;
    }

    add(data) {
        if (this._compiled) {
            throw Error("Buffer already compiled, cannot add more data");
        }
 
        if (this._sanityCheck) {
            this._checkDataMatchesAttributes(data);
        }

        if (this._willOverflow(data)) {
            console.log("Cycling buffer...");
            this._cycle();
        }

        // Add the new indices data
        data.indices.forEach((indexData, i) => {
            this._buffer.indices.data[i + this._indicesInsertIndex] = indexData + this._maxIndex;
        });

        this._indicesInsertIndex += data.indices.length;
        this._maxIndex += 1 + Math.max(...data.indices);
        
        for (const attr in this._attributes) {
            this._addDataToAttribute(attr, data[attr]);
        }

    }

    compile(gl) {
        if (this._compiled) {
            return;
        }

        this._cycle();

        this.WebGLBuffers = new Array(this._completeBuffers.length);

        this._completeBuffers.forEach((buffer, i) => {
            this.WebGLBuffers[i] = {
                buffer: twgl.createBufferInfoFromArrays(gl, buffer.buffer),
                numElements: buffer.numElements
            };
        });

        this._compiled = true;
    }

}


class BottomlessBuffer {

    constructor(attributes) {
        this._completeBuffers = [];

        this._compiled = false;
        this.WebGLBuffers = [];

        this._attributes = {};
        for (const attr of attributes) {
            this._attributes[attr.name] = {
                numComponents: attr.numComponents
            };
        }

        this._maxIndex = 0;
        this._sanityCheck = false;

        this._getNewBuffer();
    }

    _getNewBuffer() {
        this._buffer = {
            indices: {numComponents: 1, data: []}
        };
        for (const attr in this._attributes) {
            this._buffer[attr] = {
                numComponents: this._attributes[attr].numComponents,
                data: []
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

    _willOverflow(data) {
        // Check for indices Uint16 overflow
        const dataMaxIndex = Math.max(...data.indices);
        return ((this._maxIndex + dataMaxIndex) > 65535);
    }

    _checkDataMatchesAttributes(data) {
        if (!('indices'in data)) {
            throw `Given data does not have indices data`;
        }
        const setsRequired = Math.max(...data.indices) + 1;
        for (const attr in this._attributes) {
            if (!(attr in data)) {
                throw Error(`Given data does not have ${attr} data`);
            }
            if (data[attr].length % this._attributes[attr].numComponents != 0) {
                throw Error(`Not enough/too much ${attr} data given`);
            }
            const numSets = data[attr].length / this._attributes[attr].numComponents;
            if (numSets != setsRequired) {
                //throw `Number of indices does not match number of ${attr} components given`;
                throw Error(`Expected ${setsRequired * this._attributes[attr].numComponents} values for ${attr}, got ${data[attr].length}`);
            }
        }
    }


    add(data) {
        if (this._compiled) {
            throw Error("Buffer already compiled, cannot add more data");
        }
 
        if (this._sanityCheck) {
            this._checkDataMatchesAttributes(data);
        }

        if (this._willOverflow(data)) {
            console.log("Cycling buffer...");
            this._cycle();
        }

        // Add the new indices data
        this._buffer.indices.data.push(...data.indices.map(x => x + this._maxIndex));
        this._maxIndex += 1 + Math.max(...data.indices);
        
        for (const attr in this._attributes) {
            this._buffer[attr].data.push(...data[attr]);
        }
    }

    compile(gl) {
        if (this._compiled) {
            return;
        }

        this._cycle();

        this.WebGLBuffers = new Array(this._completeBuffers.length);

        this._completeBuffers.forEach((buffer, i) => {
            this.WebGLBuffers[i] = {
                buffer: twgl.createBufferInfoFromArrays(gl, buffer.buffer),
                numElements: buffer.numElements
            };
        });

        this._compiled = true;
    }

}


module.exports.SegmentedBuffer = SegmentedBuffer;
module.exports.BottomlessBuffer = BottomlessBuffer;