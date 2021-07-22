const twgl = require('twgl.js');
const fs = require('fs');
const path = require('path');
const gl = document.querySelector("#c").getContext("webgl");

function getShader(filename) {
    const absPath = path.join(__dirname, '../shaders/' + filename);
    return fs.readFileSync(absPath, 'utf8');
}

const shadedVertexShader = getShader('shaded_vertex.vs');
const shadedFragmentShader = getShader('shaded_fragment.fs');

const debugVertexShader = getShader('debug_vertex.vs');
const debugFragmentShader = getShader('debug_fragment.fs');

const aoVertexShader = getShader('ao_vertex.vs');
const aoFragmentShader = getShader('ao_fragment.fs');

const shadedProgram = twgl.createProgramInfo(gl, [shadedVertexShader, shadedFragmentShader]);
const debugProgram = twgl.createProgramInfo(gl, [debugVertexShader, debugFragmentShader]);
const aoProgram = twgl.createProgramInfo(gl, [aoVertexShader, aoFragmentShader]);

module.exports.shadedProgram = shadedProgram;
module.exports.debugProgram = debugProgram;
module.exports.aoProgram = aoProgram;