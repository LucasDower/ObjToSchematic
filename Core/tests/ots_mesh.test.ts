import { OtS_Mesh } from "../src/ots_mesh";
import { OtS_Colours } from '../src/colour';

test('Mesh Triangles', () => {
    const mesh = OtS_Mesh.create();

    mesh.addSection({
        name: 'Test Section 1',
        type: 'solid',
        colour: OtS_Colours.WHITE,
        positionData: Float32Array.from([
            0.0, 0.0, 0.0,
            1.0, 2.0, 3.0,
            4.0, 5.0, 6.0,
            0.0, 0.0, 0.0,
            1.0, 2.0, 3.0,
            4.0, 5.0, 6.0,
        ]),
        normalData: Float32Array.from([
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
        ]),
        indexData: Uint32Array.from([
            0, 1, 2,
            3, 4, 5
        ]),
    });

    mesh.addSection({
        name: 'Test Section 2',
        type: 'solid',
        colour: OtS_Colours.WHITE,
        positionData: Float32Array.from([
            0.0, 0.0, 0.0,
            1.0, 2.0, 3.0,
            4.0, 5.0, 6.0,
        ]),
        normalData: Float32Array.from([
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
        ]),
        indexData: Uint32Array.from([
            0, 1, 2,
        ]),
    });

    expect(mesh.calcTriangleCount()).toBe(3);

    const triangles = Array.from(mesh.getTriangles());
    expect(triangles.length).toBe(3);
});