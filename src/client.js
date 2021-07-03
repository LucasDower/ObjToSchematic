const { Renderer } = require('./src/renderer.js');
const { Vector3 } = require('./src/vector.js');
const { Triangle } = require('./src/triangle.js');
const { VoxelManager } = require('./src/voxel_manager.js');

const renderer = new Renderer();
const voxelManager = new VoxelManager(0.25);
const triangle = new Triangle(new Vector3(0, 0, 0), new Vector3(4, 3, 1), new Vector3(2, -3, -2));

renderer.setStroke(new Vector3(1.0, 0.0, 0.0));
renderer.registerTriangle(triangle.v0, triangle.v1, triangle.v2);

voxelManager.voxeliseTriangle(triangle, renderer);

renderer.compileRegister();


function render(time) {
    renderer.begin();

    renderer.end();

    requestAnimationFrame(render);
}

requestAnimationFrame(render);