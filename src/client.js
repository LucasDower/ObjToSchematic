const { Renderer } = require('./src/renderer.js');
const { Vector3 } = require('./src/vector.js');
const { Triangle } = require('./src/triangle.js');
const { Mesh } = require('./src/mesh.js');
const { VoxelManager } = require('./src/voxel_manager.js');

const voxelSize = 0.025;
const renderer = new Renderer(voxelSize);
const voxelManager = new VoxelManager(voxelSize);
const triangle = new Triangle(new Vector3(0, 0, 0), new Vector3(4, 3, 1), new Vector3(2, -3, -2));
const triangle2 = new Triangle(new Vector3(5, 2, -1), new Vector3(-2, 3, -1), new Vector3(0, 3, 2));

const suzanneLeft = new Mesh('./resources/suzanne_left.obj');
voxelManager.voxeliseMesh(suzanneLeft);
renderer.registerVoxels(voxelManager.voxels);

const suzanneRight = new Mesh('./resources/suzanne_right.obj');
renderer.registerMesh(suzanneRight);


renderer.compileRegister();


function render(time) {
    renderer.begin();
    renderer.end();

    requestAnimationFrame(render);
}

requestAnimationFrame(render);