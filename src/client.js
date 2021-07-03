const { Renderer } = require('./src/renderer.js');
const { Vector3 } = require('./src/vector.js');
const { Triangle } = require('./src/triangle.js');
const { VoxelManager } = require('./src/voxel_manager.js');

const voxelSize = 0.1;
const renderer = new Renderer(voxelSize);
const voxelManager = new VoxelManager(voxelSize);
const triangle = new Triangle(new Vector3(0, 0, 0), new Vector3(4, 3, 1), new Vector3(2, -3, -2));
const triangle2 = new Triangle(new Vector3(5, 2, -1), new Vector3(-2, 3, -1), new Vector3(0, 3, 2));
console.log(triangle2);

renderer.setStroke(new Vector3(1.0, 0.0, 0.0));
renderer.registerTriangle(triangle);
renderer.registerTriangle(triangle2);

voxelManager.voxeliseTriangle(triangle);
voxelManager.voxeliseTriangle(triangle2);

renderer.setStroke(new Vector3(1.0, 1.0, 1.0));
renderer.registerVoxels(voxelManager.voxels);

renderer.compileRegister();


function render(time) {
    renderer.begin();

    renderer.end();

    requestAnimationFrame(render);
}

requestAnimationFrame(render);