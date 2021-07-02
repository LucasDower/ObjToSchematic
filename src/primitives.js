const twgl = require('twgl.js');
const { v3: Vector3 } = require('twgl.js');
const { nodeModuleNameResolver } = require('typescript');

function getBoxFromCorners(a, b) {
    const centre = Vector3.add(a, b).mulScalar(0.5);
    const extents = Vector3.create(
        Math.abs(a[0] - b[0]) / 2,
        Math.abs(a[1] - b[1]) / 2,
        Math.abs(a[2] - b[2]) / 2
    );
    return getBoxFromCentreExtents(centre, extents);
}

function getBoxFromCentreExtents(centre, extents) {
    let cube = twgl.primitives.createCubeVertices(1);
    // Translate cube to voxel's position
    for (let i = 0; i < 72; i += 3) {
        cube.position[i + 0] = (cube.position[i + 0] * extents[0]) + centre[0];
        cube.position[i + 1] = (cube.position[i + 1] * extents[1]) + centre[1];
        cube.position[i + 2] = (cube.position[i + 2] * extents[2]) + centre[2];
    }

    return cube;
}

module.exports.getBoxFromCorners = getBoxFromCorners;
module.exports.getBoxFromCentreExtents = getBoxFromCentreExtents;