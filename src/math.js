// Not apart of rendering, SIMD optimisation not necessary
const { v3: Vector3 } = require('twgl.js');

function roundTo(value, base) {
    return Math.round(value / base) * base;
}

function floorTo(value, base) {
    return Math.floor(value / base) * base;
}

function ceilTo(value, base) {
    return Math.ceil(value / base) * base;
}

function fastCrossXAxis(vec) {
    return Vector3.create(0.0, -vec[2], vec[1]);
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

function fastCrossYAxis(vec) {
    return Vector3.create(vec[2], 0.0, -vec[0]);
}

function fastCrossZAxis(vec) {
    return Vector3.create(-vec[1], vec[0], 0.0);
}

function roundVector3To(vec, round) {
    vec[0] = roundTo(vec[0], round);
    vec[1] = roundTo(vec[1], round);
    vec[2] = roundTo(vec[2], round);
}


module.exports.floorTo = floorTo;
module.exports.ceilTo = ceilTo;

module.exports.fastCrossXAxis = fastCrossXAxis;
module.exports.fastCrossYAxis = fastCrossYAxis;
module.exports.fastCrossZAxis = fastCrossZAxis;

module.exports.fastDotXAxis = fastDotXAxis;
module.exports.fastDotYAxis = fastDotYAxis;
module.exports.fastDotZAxis = fastDotZAxis;

module.exports.xAxis = Vector3.create(1.0, 0.0, 0.0);
module.exports.yAxis = Vector3.create(0.0, 1.0, 0.0);
module.exports.zAxis = Vector3.create(0.0, 0.0, 1.0);

module.exports.roundVector3To = roundVector3To;