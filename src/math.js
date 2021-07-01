// Not apart of rendering, SIMD optimisation not necessary
const { v3: Vector3 } = require('twgl.js');

function floorTo(value, base) {
    return Math.floor(value / base) * base;
}

function ceilTo(value, base) {
    return Math.ceil(value / base) * base;
}



module.exports.floorTo = floorTo;
module.exports.ceilTo = ceilTo;

module.exports.xAxis = Vector3.create(1.0, 0.0, 0.0);
module.exports.yAxis = Vector3.create(0.0, 1.0, 0.0);
module.exports.zAxis = Vector3.create(0.0, 0.0, 1.0);