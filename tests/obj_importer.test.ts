import { ObjImporter } from '../src/importers/obj_importer';
import { ASSERT } from '../src/util/error_util';
import { Vector3 } from '../src/vector';

test('Parse vertex #1', () => {
    const importer = new ObjImporter();
    importer.parseOBJLine('v 1.0 -2.0 3.0');
    const mesh = importer.toMesh();
    expect(mesh._vertices.length).toEqual(1);
    expect(mesh._vertices[0].equals(new Vector3(1, -2, 3))).toBe(true);
});

test('Parse vertex #2', () => {
    const importer = new ObjImporter();
    importer.parseOBJLine('v 4.467e+000 9.243e+000 9.869e+000');
    const mesh = importer.toMesh();
    expect(mesh._vertices.length).toEqual(1);
    expect(mesh._vertices[0].equals(new Vector3(4.467e+000, 9.243e+000, 9.869e+000))).toBe(true);
});

test('Parse normal #1', () => {
    const importer = new ObjImporter();
    importer.parseOBJLine('vn -1.0 -0.5 0.0');
    const mesh = importer.toMesh();
    expect(mesh._normals.length).toEqual(1);
    expect(mesh._normals[0].equals(new Vector3(-1, -0.5, 0))).toBe(true);
});

test('Parse texcoord #1', () => {
    const importer = new ObjImporter();
    importer.parseOBJLine('vt 0.5 -0.8');
    const mesh = importer.toMesh();
    expect(mesh._uvs.length).toEqual(1);
    expect(mesh._uvs[0].u === 0.5 && mesh._uvs[0].v === -0.8).toBe(true);
});

test('Parse face #1', () => {
    const importer = new ObjImporter();
    importer.parseOBJLine('f 12 24 36');
    const mesh = importer.toMesh();
    expect(mesh._tris.length).toEqual(1);
    const tri = mesh._tris[0];
    expect(tri.texcoordIndices).toBeDefined(); ASSERT(tri.texcoordIndices);
    expect(tri.normalIndices).toBeDefined(); ASSERT(tri.normalIndices);
    expect(tri.positionIndices.x === 12 - 1 && tri.positionIndices.y === 24 - 1 && tri.positionIndices.z === 36 - 1).toBe(true);
    expect(tri.texcoordIndices.x === 12 - 1 && tri.texcoordIndices.y === 24 - 1 && tri.texcoordIndices.z === 36 - 1).toBe(true);
    expect(tri.normalIndices.x   === 12 - 1 && tri.normalIndices.y   === 24 - 1 && tri.normalIndices.z   === 36 - 1).toBe(true);
});

test('Parse face #2', () => {
    const importer = new ObjImporter();
    importer.parseOBJLine('f 1/2 3/4 5/6');
    const mesh = importer.toMesh();
    expect(mesh._tris.length).toEqual(1);
    const tri = mesh._tris[0];
    expect(tri.texcoordIndices).toBeDefined(); ASSERT(tri.texcoordIndices);
    expect(tri.normalIndices).toBeUndefined();
    expect(tri.positionIndices.x === 1 - 1 && tri.positionIndices.y === 3 - 1 && tri.positionIndices.z === 5 - 1).toBe(true);
    expect(tri.texcoordIndices.x === 2 - 1 && tri.texcoordIndices.y === 4 - 1 && tri.texcoordIndices.z === 6 - 1).toBe(true);
});

test('Parse face #3', () => {
    const importer = new ObjImporter();
    importer.parseOBJLine('f 11/2/3 4/55/6 7/8/99');
    const mesh = importer.toMesh();
    expect(mesh._tris.length).toEqual(1);
    const tri = mesh._tris[0];
    expect(tri.texcoordIndices).toBeDefined(); ASSERT(tri.texcoordIndices);
    expect(tri.normalIndices).toBeDefined(); ASSERT(tri.normalIndices);
    expect(tri.positionIndices.x === 11 - 1 && tri.positionIndices.y === 4 - 1&& tri.positionIndices.z === 7 - 1).toBe(true);
    expect(tri.texcoordIndices.x === 2 - 1 && tri.texcoordIndices.y === 55 - 1 && tri.texcoordIndices.z === 8 - 1).toBe(true);
    expect(tri.normalIndices.x === 3 - 1 && tri.normalIndices.y === 6 - 1 && tri.normalIndices.z === 99 - 1).toBe(true);
});

test('Parse mini #1', () => {
    const importer = new ObjImporter();
    importer.parseOBJLine('v -1 2 3');
    importer.parseOBJLine('v 4 -5 6');
    importer.parseOBJLine('v 7 8 -9');
    importer.parseOBJLine('vn 0.0 0.1 0.2');
    importer.parseOBJLine('vn 0.3 0.4 0.5');
    importer.parseOBJLine('vn 0.6 0.7 0.8');
    importer.parseOBJLine('vt 0.0 0.5');
    importer.parseOBJLine('vt 0.5 1.0');
    importer.parseOBJLine('vt 1.0 0.0');
    importer.parseOBJLine('f 1 2 3');
    const mesh = importer.toMesh();

    expect(mesh._vertices.length).toEqual(3);
    expect(mesh._uvs.length).toEqual(3);
    expect(mesh._normals.length).toEqual(3);
    expect(mesh._tris.length).toEqual(1);

    const vertexData = mesh.getVertices(0);
    expect(vertexData.v0.equals(new Vector3(-1, 2, 3))).toBe(true);
    expect(vertexData.v1.equals(new Vector3(4, -5, 6))).toBe(true);
    expect(vertexData.v2.equals(new Vector3(7, 8, -9))).toBe(true);
    
    const texcoordData = mesh.getUVs(0);
    expect(texcoordData.uv0.u === 0.0 && texcoordData.uv0.v === 0.5).toBe(true);
    expect(texcoordData.uv1.u === 0.5 && texcoordData.uv1.v === 1.0).toBe(true);
    expect(texcoordData.uv2.u === 1.0 && texcoordData.uv2.v === 0.0).toBe(true);

    const normalData = mesh.getNormals(0);
    expect(normalData.v0.equals(new Vector3(0.0, 0.1, 0.2))).toBe(true);
    expect(normalData.v1.equals(new Vector3(0.3, 0.4, 0.5))).toBe(true);
    expect(normalData.v2.equals(new Vector3(0.6, 0.7, 0.8))).toBe(true);
});


test('Parse mini #2', () => {
    const importer = new ObjImporter();
    importer.parseOBJLine('v -1 2 3');
    importer.parseOBJLine('v 4 -5 6');
    importer.parseOBJLine('v 7 8 -9');
    importer.parseOBJLine('vn 0.0 0.1 0.2');
    importer.parseOBJLine('vn 0.3 0.4 0.5');
    importer.parseOBJLine('vn 0.6 0.7 0.8');
    importer.parseOBJLine('vt 0.0 0.5');
    importer.parseOBJLine('vt 0.5 1.0');
    importer.parseOBJLine('vt 1.0 0.0');
    importer.parseOBJLine('f 3/1/2 1/2/3 2/3/1');
    const mesh = importer.toMesh();

    expect(mesh._vertices.length).toEqual(3);
    expect(mesh._uvs.length).toEqual(3);
    expect(mesh._normals.length).toEqual(3);
    expect(mesh._tris.length).toEqual(1);

    const vertexData = mesh.getVertices(0);
    expect(vertexData.v0.equals(new Vector3(7, 8, -9))).toBe(true);
    expect(vertexData.v1.equals(new Vector3(-1, 2, 3))).toBe(true);
    expect(vertexData.v2.equals(new Vector3(4, -5, 6))).toBe(true);
    
    const texcoordData = mesh.getUVs(0);
    expect(texcoordData.uv0.u === 0.0 && texcoordData.uv0.v === 0.5).toBe(true);
    expect(texcoordData.uv1.u === 0.5 && texcoordData.uv1.v === 1.0).toBe(true);
    expect(texcoordData.uv2.u === 1.0 && texcoordData.uv2.v === 0.0).toBe(true);

    const normalData = mesh.getNormals(0);
    expect(normalData.v0.equals(new Vector3(0.3, 0.4, 0.5))).toBe(true);
    expect(normalData.v1.equals(new Vector3(0.6, 0.7, 0.8))).toBe(true);
    expect(normalData.v2.equals(new Vector3(0.0, 0.1, 0.2))).toBe(true);
});

test('Parse mini #3', () => {
    const importer = new ObjImporter();
    importer.parseOBJLine('v 0 0 0');
    importer.parseOBJLine('v 1 0 0');
    importer.parseOBJLine('v 0 1 0');
    importer.parseOBJLine('f 1 2 3');
    const mesh = importer.toMesh();

    expect(mesh._vertices.length).toEqual(3);
    expect(mesh._uvs.length).toEqual(0);
    expect(mesh._normals.length).toEqual(0);
    expect(mesh._tris.length).toEqual(1);

    const texcoordData = mesh.getUVs(0);
    expect(texcoordData.uv0.u === 0.0 && texcoordData.uv0.v === 0.0).toBe(true);
    expect(texcoordData.uv1.u === 0.0 && texcoordData.uv1.v === 0.0).toBe(true);
    expect(texcoordData.uv2.u === 0.0 && texcoordData.uv2.v === 0.0).toBe(true);

    const normalData = mesh.getNormals(0);
    expect(normalData.v0.equals(new Vector3(0.0, 0.0, 1.0))).toBe(true);
    expect(normalData.v1.equals(new Vector3(0.0, 0.0, 1.0))).toBe(true);
    expect(normalData.v2.equals(new Vector3(0.0, 0.0, 1.0))).toBe(true);
});

test('Parse comments', () => {
    const importer = new ObjImporter();
    importer.parseOBJLine('# v -1 2 3');
    importer.parseOBJLine('# vn 0.0 0.1 0.2');
    importer.parseOBJLine('# vt 0.0 0.5');
    importer.parseOBJLine('# f 1 1 1');
    const mesh = importer.toMesh();

    expect(mesh._vertices.length).toEqual(0);
    expect(mesh._uvs.length).toEqual(0);
    expect(mesh._normals.length).toEqual(0);
    expect(mesh._tris.length).toEqual(0);
});
