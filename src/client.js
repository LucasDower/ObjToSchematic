const { Renderer } = require('./src/renderer.js');
const { Vector3 } = require('./src/vector.js');
const { Triangle } = require('./src/triangle.js');
const { Mesh } = require('./src/mesh.js');
const { VoxelManager } = require('./src/voxel_manager.js');

const voxelSize = 0.1;
const renderer = new Renderer(voxelSize);
const voxelManager = new VoxelManager(voxelSize);
const triangle = new Triangle(new Vector3(0, 0, 0), new Vector3(4, 3, 1), new Vector3(2, -3, -2));
const triangle2 = new Triangle(new Vector3(5, 2, -1), new Vector3(-2, 3, -1), new Vector3(0, 3, 2));

const suzanne = new Mesh('./resources/suzanne.obj');
console.log(suzanne.triangles);

renderer.registerMesh(suzanne);

//voxelManager.voxeliseTriangle(triangle2);
//voxelManager.voxeliseTriangle(triangle);

//renderer.registerVoxels(voxelManager.voxels);

renderer.compileRegister();


function render(time) {
    renderer.begin();
    renderer.end();

    requestAnimationFrame(render);
}

requestAnimationFrame(render);