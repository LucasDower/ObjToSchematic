import { Vector3 } from "./vector";


export class AABB {

    public readonly centre: Vector3;
    public readonly size: Vector3;
    public readonly a: Vector3;
    public readonly b: Vector3

    constructor(centre: Vector3, size: Vector3) {
        this.centre = centre;
        this.size = size;

        this.a = Vector3.sub(centre, Vector3.mulScalar(size, 0.5));
        this.b = Vector3.add(centre, Vector3.mulScalar(size, 0.5));
    }

}


export class CubeAABB extends AABB {

    readonly width: number;

    constructor(centre: Vector3, width: number) {
        const sizeVector = new Vector3(width, width, width);
        super(centre, sizeVector);
        
        this.width = width;
    }

    public subdivide() {
        const newWidth = this.width / 2;
        const offset = this.width / 4;

        return [
            new CubeAABB(Vector3.add(this.centre, new Vector3(-offset, -offset, -offset)), newWidth),
            new CubeAABB(Vector3.add(this.centre, new Vector3( offset, -offset, -offset)), newWidth),
            new CubeAABB(Vector3.add(this.centre, new Vector3(-offset,  offset, -offset)), newWidth),
            new CubeAABB(Vector3.add(this.centre, new Vector3( offset,  offset, -offset)), newWidth),
            new CubeAABB(Vector3.add(this.centre, new Vector3(-offset, -offset,  offset)), newWidth),
            new CubeAABB(Vector3.add(this.centre, new Vector3( offset, -offset,  offset)), newWidth),
            new CubeAABB(Vector3.add(this.centre, new Vector3(-offset,  offset,  offset)), newWidth),
            new CubeAABB(Vector3.add(this.centre, new Vector3( offset,  offset,  offset)), newWidth),
        ];
    }

}