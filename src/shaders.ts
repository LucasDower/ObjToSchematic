import * as twgl from 'twgl.js';
import * as fs from 'fs';
import * as path from 'path';
import { Renderer } from './renderer';
import { SHADERS_DIR } from './util';

export class ShaderManager {
    public readonly textureTriProgram: twgl.ProgramInfo;
    public readonly solidTriProgram: twgl.ProgramInfo;
    public readonly voxelProgram: twgl.ProgramInfo;
    public readonly blockProgram: twgl.ProgramInfo;
    public readonly debugProgram: twgl.ProgramInfo;

    private static _instance: ShaderManager;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        const gl = Renderer.Get._gl;

        const textureTriVertex = this._getShader('texture_tri_vertex.vs');
        const textureTriFragment = this._getShader('texture_tri_fragment.fs');
        this.textureTriProgram = twgl.createProgramInfo(gl, [textureTriVertex, textureTriFragment]);

        const solidTriVertex = this._getShader('solid_tri_vertex.vs');
        const solidTriFragment = this._getShader('solid_tri_fragment.fs');
        this.solidTriProgram = twgl.createProgramInfo(gl, [solidTriVertex, solidTriFragment]);

        const voxelVertexShader = this._getShader('voxel_vertex.vs');
        const voxelFragmentShader = this._getShader('voxel_fragment.fs');
        this.voxelProgram = twgl.createProgramInfo(gl, [voxelVertexShader, voxelFragmentShader]);

        const blockVertexShader = this._getShader('block_vertex.vs');
        const blockFragmentShader = this._getShader('block_fragment.fs');
        this.blockProgram = twgl.createProgramInfo(gl, [blockVertexShader, blockFragmentShader]);

        const debugVertexShader = this._getShader('debug_vertex.vs');
        const debugFragmentShader = this._getShader('debug_fragment.fs');
        this.debugProgram = twgl.createProgramInfo(gl, [debugVertexShader, debugFragmentShader]);
    }

    private _getShader(filename: string) {
        const absPath = path.join(SHADERS_DIR, filename);
        return fs.readFileSync(absPath, 'utf8');
    }
}
