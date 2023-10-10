import * as twgl from 'twgl.js';

import FRAG_BLOCK from '../../res/shaders/block_fragment.fs';
import VERT_BLOCK from '../../res/shaders/block_vertex.vs';
import FRAG_DEBUG from '../../res/shaders/debug_fragment.fs';
import VERT_DEBUG from '../../res/shaders/debug_vertex.vs';
import FRAG_TRI_SOLID from '../../res/shaders/solid_tri_fragment.fs';
import VERT_TRI_SOLID from '../../res/shaders/solid_tri_vertex.vs';
import FRAG_TRI_TEXTURE from '../../res/shaders/texture_tri_fragment.fs';
import VERT_TRI_TEXTURE from '../../res/shaders/texture_tri_vertex.vs';
import FRAG_VOXEL from '../../res/shaders/voxel_fragment.fs';
import VERT_VOXEL from '../../res/shaders/voxel_vertex.vs';

export class ShaderManager {
    public textureTriProgram?: twgl.ProgramInfo;
    public solidTriProgram?: twgl.ProgramInfo;
    public voxelProgram?: twgl.ProgramInfo;
    public blockProgram?: twgl.ProgramInfo;
    public debugProgram?: twgl.ProgramInfo;

    private static _instance: ShaderManager;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
    }

    public init(gl: WebGL2RenderingContext) {
        this.textureTriProgram = twgl.createProgramInfo(gl, [VERT_TRI_TEXTURE, FRAG_TRI_TEXTURE]);

        this.solidTriProgram = twgl.createProgramInfo(gl, [VERT_TRI_SOLID, FRAG_TRI_SOLID]);

        this.voxelProgram = twgl.createProgramInfo(gl, [VERT_VOXEL, FRAG_VOXEL]);

        this.blockProgram = twgl.createProgramInfo(gl, [VERT_BLOCK, FRAG_BLOCK]);

        this.debugProgram = twgl.createProgramInfo(gl, [VERT_DEBUG, FRAG_DEBUG]);
    }
}
