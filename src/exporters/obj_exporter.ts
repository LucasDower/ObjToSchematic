import { BlockMesh } from '../block_mesh';
import { IExporter } from './base_exporter';
import { ASSERT, ATLASES_DIR, RESOURCES_DIR } from '../util';

import fs from 'fs';
import path from 'path';

export class ObjExporter extends IExporter {
    public override getFormatFilter(): Electron.FileFilter {
        return {
            name: 'Wavefront Obj',
            extensions: ['obj'],
        };
    }

    public override getFileExtension(): string {
        return 'obj';
    }

    public override getFormatName(): string {
        return 'Wavefront OBJ';
    }

    public override export(blockMesh: BlockMesh, filepath: string) {
        ASSERT(path.isAbsolute(filepath));
        const parsedPath = path.parse(filepath);
        
        const filepathOBJ = filepath;
        const filepathMTL = path.join(parsedPath.dir, parsedPath.name + '.mtl');
        const filepathTexture = path.join(parsedPath.dir, parsedPath.name + '.png');

        this._exportOBJ(filepathOBJ, blockMesh, parsedPath.name + '.mtl');
        this._exportMTL(filepathMTL, filepathTexture, blockMesh);

        return true;
    }

    private _exportOBJ(filepath: string, blockMesh: BlockMesh, mtlRelativePath: string) {
        const buffer = blockMesh.createBuffer();
        const positionData = buffer.position.data as Float32Array;
        const normalData = buffer.normal.data as Float32Array;
        const texcoordData = buffer.texcoord.data as Float32Array;
        const blockTexcoordData = buffer.blockTexcoord.data as Float32Array;
        const indexData = buffer.indices.data as Uint32Array;
        
        const objData: string[] = [];
        objData.push('# Created with ObjToSchematic');
        objData.push('# https://github.com/LucasDower/ObjToSchematic/');
        
        if (positionData && normalData && texcoordData && indexData && blockTexcoordData) {
            const numTris = indexData.length / 3;
            // Add vertex data
            objData.push(`mtllib ${mtlRelativePath}`);
            objData.push(`o Object`);
            for (let i = 0; i < positionData.length / 3; ++i) {
                objData.push(`v ${positionData[3 * i + 0]} ${positionData[3 * i + 1]} ${positionData[3 * i + 2]}`);
            }
            // Add texcoord data
            const atlasSize = blockMesh.getAtlasSize(); 
            for (let i = 0; i < texcoordData.length / 2; ++i) {
                // vec2 tex = v_blockTexcoord + (v_texcoord / (u_atlasSize * 3.0));
                const u = blockTexcoordData[2 * i + 0] + (texcoordData[2 * i + 0] / (atlasSize * 3.0));
                const v = blockTexcoordData[2 * i + 1] + (texcoordData[2 * i + 1] / (atlasSize * 3.0));
                objData.push(`vt ${u} ${1.0 - v}`);
            }
            // Add normal data
            for (let i = 0; i < normalData.length / 3; ++i) {
                objData.push(`vn ${normalData[3 * i + 0]} ${normalData[3 * i + 1]} ${normalData[3 * i + 2]}`);
            }

            objData.push(`usemtl Default`);
            // Add face data
            for (let i = 0; i < numTris * 3; i += 3) {
                const a = indexData[i + 0] + 1;
                const b = indexData[i + 1] + 1;
                const c = indexData[i + 2] + 1;
                objData.push(`f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}`);
            }
            // Export to file
            const outputString = objData.join('\n');
            fs.writeFileSync(filepath, outputString);
        }
    }

    private _exportMTL(filepathMTL: string, filepathTexture: string, blockMesh: BlockMesh) {
        ASSERT(path.isAbsolute(filepathMTL));
        ASSERT(path.isAbsolute(filepathTexture));

        const mtlData: string[] = [];
        mtlData.push('# Created with ObjToSchematic');
        mtlData.push('# https://github.com/LucasDower/ObjToSchematic/');
        
        mtlData.push('newmtl Default');
        mtlData.push('Kd 1.000000 1.000000 1.000000');
        mtlData.push(`map_Kd ${filepathTexture}`);

        // Export to file
        const outputString = mtlData.join('\n');
        fs.writeFileSync(filepathMTL, outputString);

        // Export texture
        const filepathAtlasTexture = path.join(ATLASES_DIR, blockMesh.getAtlasUsed() + '.png');
        fs.copyFileSync(filepathAtlasTexture, filepathTexture);
    }
}
