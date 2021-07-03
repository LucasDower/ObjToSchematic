const { Vector3 } = require('./vector.js');

class AABB {

    constructor(centre, size) {
        this.centre = centre;
        this.size = size;

        this.a = Vector3.sub(centre, Vector3.mulScalar(size, 0.5));
        this.b = Vector3.add(centre, Vector3.mulScalar(size, 0.5));
    }

    subdivide() {
        const newSize = Vector3.divScalar(this.size, 2);
        const offset = Vector3.divScalar(this.size, 4);

        return [
            new AABB(Vector3.add(this.centre, new Vector3(-offset.x, -offset.y, -offset.z)), newSize),
            new AABB(Vector3.add(this.centre, new Vector3( offset.x, -offset.y, -offset.z)), newSize),
            new AABB(Vector3.add(this.centre, new Vector3(-offset.x,  offset.y, -offset.z)), newSize),
            new AABB(Vector3.add(this.centre, new Vector3( offset.x,  offset.y, -offset.z)), newSize),
            new AABB(Vector3.add(this.centre, new Vector3(-offset.x, -offset.y,  offset.z)), newSize),
            new AABB(Vector3.add(this.centre, new Vector3( offset.x, -offset.y,  offset.z)), newSize),
            new AABB(Vector3.add(this.centre, new Vector3(-offset.x,  offset.y,  offset.z)), newSize),
            new AABB(Vector3.add(this.centre, new Vector3( offset.x,  offset.y,  offset.z)), newSize),
        ];
    }

}

module.exports.AABB = AABB;