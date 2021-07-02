const twgl = require('twgl.js');
const { v3: Vector3 } = require('twgl.js');

const { ArcballCamera } = require('./src/camera.js');
const { VoxelRenderer } = require('./src/voxel_renderer.js');
const { Triangle } = require('./src/triangle.js');
const { Mesh } = require('./src/mesh.js');

const eventManager = require('./src/events.js');
const { AABB } = require('./src/aabb.js');

const gl = document.querySelector("#c").getContext("webgl");
const camera = new ArcballCamera(30, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.5, 30.0);

const voxelSize = Math.pow(2, 2);
const voxelRenderer = new VoxelRenderer(gl, voxelSize * 2);

eventManager.registerCanvasEvents(gl, camera);

const v0 = Vector3.create(3.9292, -7.96029, 9.93253);
const v1 = Vector3.create(28.6307, 27.95673, 15.75666);
const v2 = Vector3.create(2.53923, 0, -20.05832);
const triangle = new Triangle(v0, v1, v2, voxelSize);

/*
const voxels = triangle.voxelise();
for (const v of voxels) {
    voxelRenderer.addVoxel(v[0], v[1], v[2]);
}
*/

//console.log(voxels);
//console.log(`There are ${voxels.length} voxels`);


const aabb = new AABB(Vector3.create(0, 0, 0), 16.0);


function render(time) {

    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    
    gl.enable(gl.DEPTH_TEST);
    //gl.enable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    camera.updateCameraPosition();

    //triangle.drawTriangle(gl, camera);
    //triangle.drawBounds(gl, camera);
    //triangle.drawSubdivisions(gl, camera);
    aabb.drawAABB(gl, camera);

    requestAnimationFrame(render);
}

requestAnimationFrame(render);