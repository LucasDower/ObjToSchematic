import * as twgl from "twgl.js";
import * as fs from "fs";
import * as path from "path";
import { Renderer } from "./renderer";


export class ShaderManager {

    public readonly shadedTextureProgram: twgl.ProgramInfo;
    public readonly shadedFillProgram: twgl.ProgramInfo;
    public readonly debugProgram: twgl.ProgramInfo;
    public readonly aoProgram: twgl.ProgramInfo;

    private static _instance: ShaderManager;

    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        const gl = Renderer.Get._gl;

        const shadedVertexTextureShader = this._getShader('shaded_vertex.vs');
        const shadedFragmentTextureShader = this._getShader('shaded_fragment.fs');
        this.shadedTextureProgram = twgl.createProgramInfo(gl, [shadedVertexTextureShader, shadedFragmentTextureShader]);

        const shadedVertexFillShader = this._getShader('shaded_vertex_fill.vs');
        const shadedFragmentFillShader = this._getShader('shaded_fragment_fill.fs');
        this.shadedFillProgram = twgl.createProgramInfo(gl, [shadedVertexFillShader, shadedFragmentFillShader]);
        
        const debugVertexShader = this._getShader('debug_vertex.vs');
        const debugFragmentShader = this._getShader('debug_fragment.fs');
        this.debugProgram = twgl.createProgramInfo(gl, [debugVertexShader, debugFragmentShader]);

        const aoVertexShader = this._getShader('ao_vertex.vs');
        const aoFragmentShader = this._getShader('ao_fragment.fs');
        this.aoProgram = twgl.createProgramInfo(gl, [aoVertexShader, aoFragmentShader]);
    }

    private _getShader(filename: string) {
        const absPath = path.join(__dirname, '../shaders/' + filename);
        return fs.readFileSync(absPath, 'utf8');
    }

}