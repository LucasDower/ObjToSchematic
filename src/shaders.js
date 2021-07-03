const twgl = require('twgl.js');
const fs = require('fs');
const gl = document.querySelector("#c").getContext("webgl");

const shaded_vertex_shader = fs.readFileSync('./shaders/shaded_vertex.vs', 'utf8');
const shaded_fragment_shader = fs.readFileSync('./shaders/shaded_fragment.fs', 'utf8');

const debug_vertex_shader = fs.readFileSync('./shaders/debug_vertex.vs', 'utf8');
const debug_fragment_shader = fs.readFileSync('./shaders/debug_fragment.fs', 'utf8');

const shadedProgram = twgl.createProgramInfo(gl, [shaded_vertex_shader, shaded_fragment_shader]);
const debugProgram = twgl.createProgramInfo(gl, [debug_vertex_shader, debug_fragment_shader]);

module.exports.shadedProgram = shadedProgram;
module.exports.debugProgram = debugProgram;
