// Not apart of rendering, SIMD optimisation not necessary
const { Vector3 } = require('./vector.js');

/*
function roundTo(value, base) {
    return Math.round(value / base) * base;
}

function floorTo(value, base) {
    return Math.floor(value / base) * base;
}

function ceilTo(value, base) {
    return Math.ceil(value / base) * base;
}

function fastDotXAxis(vec) {
    return vec[0];
}

function fastDotYAxis(vec) {
    return vec[1];
}

function fastDotZAxis(vec) {
    return vec[2];
}
*/

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

//module.exports.roundVector3To = roundVector3To;