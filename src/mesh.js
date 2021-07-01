
const { v3: Vector3 } = require('twgl.js');
const { Triangle } = require('./triangle.js');

const fs = require('fs');
const twgl = require('twgl.js');
const wavefrontObjParser = require('wavefront-obj-parser');
const expandVertexData = require('expand-vertex-data');


class Mesh {

    constructor(obj_path, gl) {
        var wavefrontString = fs.readFileSync(obj_path).toString('utf8');
        var parsedJSON = wavefrontObjParser(wavefrontString);
        var expanded = expandVertexData(parsedJSON, {facesToTriangles: true});
    
        this.model = {
            position: expanded.positions,
            normal: expanded.normals,
            indices: expanded.positionIndices
        };

        this.buffers = [twgl.createBufferInfoFromArrays(gl, this.model)];
    }

    voxelise(voxel_size, gl) {
        // Extract triangles from mesh
        let triangles = [];
        for (let i = 0; i < this.model.indices.length; i += 3) {
            let i0 = this.model.indices[i];
            let i1 = this.model.indices[i + 1];
            let i2 = this.model.indices[i + 2];
            let v0 = this.model.position.slice(3 * i0, 3 * i0 + 3);
            let v1 = this.model.position.slice(3 * i1, 3 * i1 + 3);
            let v2 = this.model.position.slice(3 * i2, 3 * i2 + 3);
            triangles.push(new Triangle(v0, v1, v2));
        }

        // Voxelise triangles
        let voxel_positions = [];
        for (let triangle of triangles) {
            let v = triangle.voxelise(voxel_size);
            voxel_positions.push(...v);
        }
        console.log(triangles);

        const cube = twgl.primitives.createCubeVertices(voxel_size);
        const num_buffers = Math.ceil(voxel_positions.length / 1024);

        // Create buffers
        let buffers = new Array(num_buffers);
        for (let i = 0; i < num_buffers; ++i) {
            buffers[i]= {
                position: { numComponents: 3, data: []},
                normal:   { numComponents: 3, data: []},
                indices:  { numComponents: 3, data: []}
            };
        }

        // Fill buffers with voxels
        for (let i = 0; i < voxel_positions.length; ++i) {
            let voxel = voxel_positions[i];

            let position_ = [];
            for (let j = 0; j < 72; j += 3) {
                position_.push(
                    cube.position[j + 0] + voxel[0],
                    cube.position[j + 1] + voxel[1],
                    cube.position[j + 2] + voxel[2]
                    );
                }
                
            const buffer_index = Math.floor(i / 1024);
            let index_offset = buffers[buffer_index].indices.data.length;
            index_offset /= 1.5;

            let indices_ = [];
            for (let j = 0; j < 36; j += 3) {
                indices_.push(
                    cube.indices[j + 0] + index_offset,
                    cube.indices[j + 1] + index_offset,
                    cube.indices[j + 2] + index_offset
                );
            }
            
            buffers[buffer_index].indices.data.push(...indices_);
            buffers[buffer_index].position.data.push(...position_);
            buffers[buffer_index].normal.data.push(...cube.normal);
        }


        let buffer_infos = new Array(num_buffers);
        for (let i = 0; i < num_buffers; ++i) {
            buffer_infos[i] = twgl.createBufferInfoFromArrays(gl, buffers[i]);
        }

        this.buffers = buffer_infos;
    }

}

module.exports.Mesh = Mesh;