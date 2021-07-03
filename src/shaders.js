const twgl = require('twgl.js');
const fs = require('fs');

const gl = document.querySelector("#c").getContext("webgl");

const shaded_vertex_shader = fs.readFileSync('./shaders/shaded_vertex.vs', 'utf8');
const shaded_fragment_shader = fs.readFileSync('./shaders/shaded_fragment.fs', 'utf8');

const unshaded_vertex_shader = fs.readFileSync('./shaders/unshaded_vertex.vs', 'utf8');
const unshaded_fragment_shader = fs.readFileSync('./shaders/unshaded_fragment.fs', 'utf8');

const unshaded_registered_vertex_shader = fs.readFileSync('./shaders/unshaded_registered_vertex.vs', 'utf8');
const unshaded_registered_fragment_shader = fs.readFileSync('./shaders/unshaded_registered_fragment.fs', 'utf8');

const test_vertex_shader = fs.readFileSync('./shaders/test_vertex.vs', 'utf8');
const test_fragment_shader = fs.readFileSync('./shaders/test_fragment.fs', 'utf8');

const shadedProgram = twgl.createProgramInfo(gl, [shaded_vertex_shader, shaded_fragment_shader]);
const unshadedProgram = twgl.createProgramInfo(gl, [unshaded_vertex_shader, unshaded_fragment_shader]);
const unshadedRegisteredProgram = twgl.createProgramInfo(gl, [unshaded_registered_vertex_shader, unshaded_registered_fragment_shader]);
const testProgram = twgl.createProgramInfo(gl, [test_vertex_shader, test_fragment_shader]);

module.exports.shadedProgram = shadedProgram;
module.exports.unshadedProgram = unshadedProgram;
module.exports.unshadedRegisteredProgram = unshadedRegisteredProgram;
module.exports.testProgram = testProgram;
