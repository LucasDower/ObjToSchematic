// Not apart of rendering, SIMD optimisation not necessary
const { Vector3 } = require('./vector.js');

/**
 * Retrieve the array key corresponding to the largest element in the array.
 *
 * @param {Array.<number>} array Input array
 * @return {number} Index of array element with largest value
 */
function argMax(array) {
    return array.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
}

function fastCrossXAxis(vec) {
    return new Vector3(0.0, -vec.z, vec.y);
}

function fastCrossYAxis(vec) {
    return new Vector3(vec.z, 0.0, -vec.x);
}

function fastCrossZAxis(vec) {
    return new Vector3(-vec.y, vec.x, 0.0);
}

/*
function roundVector3To(vec, round) {
    vec[0] = roundTo(vec[0], round);
    vec[1] = roundTo(vec[1], round);
    vec[2] = roundTo(vec[2], round);
}


module.exports.floorTo = floorTo;
module.exports.ceilTo = ceilTo;
*/

module.exports.fastCrossXAxis = fastCrossXAxis;
module.exports.fastCrossYAxis = fastCrossYAxis;
module.exports.fastCrossZAxis = fastCrossZAxis;

/*
module.exports.fastDotXAxis = fastDotXAxis;
module.exports.fastDotYAxis = fastDotYAxis;
module.exports.fastDotZAxis = fastDotZAxis;
*/

module.exports.xAxis = new Vector3(1.0, 0.0, 0.0);
module.exports.yAxis = new Vector3(0.0, 1.0, 0.0);
module.exports.zAxis = new Vector3(0.0, 0.0, 1.0);

module.exports.argMax = argMax;

//module.exports.roundVector3To = roundVector3To;