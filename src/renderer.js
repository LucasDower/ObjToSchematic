const twgl = require('twgl.js');
const fs = require('fs');

const mouseHandler = require('./src/mouse.js');
const cameraHandler = require('./src/camera.js');
const shaderManager = require('./src/shaders.js');
const gridManager = require('./src/grid.js');

const { Triangle } = require('./src/triangle.js');

const wavefrontObjParser = require('wavefront-obj-parser');
const expandVertexData = require('expand-vertex-data');

const { Mesh } = require('./src/mesh.js');

const v3 = twgl.v3;
const gl = document.querySelector("#c").getContext("webgl");


let suzanne_left = new Mesh('./resources/suzanne_left.obj', gl);
let suzanne_right = new Mesh('./resources/suzanne_right.obj', gl);


suzanne_left.voxelise(0.025, gl);
const suzanne_left_buffers = suzanne_left.buffers;
const suzanne_right_buffers = suzanne_right.buffers;



var camera = new cameraHandler.ArcballCamera(30, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.5, 30.0);

const gridMesh = gridManager.generateGridMesh();
const gridBuffer = twgl.createBufferInfoFromArrays(gl, gridMesh);


gl.canvas.addEventListener('mousedown', (e) => {
    camera.isRotating = true;
});

gl.canvas.addEventListener('mouseup', (e) => {
    camera.isRotating = false;
});

gl.canvas.addEventListener('mousemove', (e) => {
    mouseHandler.handleInput(e);
    camera.updateCamera();
});

gl.canvas.addEventListener('wheel', (e) => {
    camera.handleScroll(e);
});


function drawModel(model, translation) {
    const uniforms = {
        u_lightWorldPos: camera.getCameraPosition(0.785398, 0),
        u_diffuse: model.textureUnit,
        u_viewInverse: camera.getCameraMatrix(),
        u_world: camera.getWorldMatrix(),
        u_worldInverseTranspose: camera.getWorldInverseTranspose(),
        u_worldViewProjection: camera.getWorldViewProjection(),
        u_translate: translation
    };

    drawBufferWithShader(gl.TRIANGLES, model, uniforms, shaderManager.shadedProgram);
}

function drawGrid() {
    const uniforms = {
        u_worldViewProjection: camera.getWorldViewProjection(),
        u_scale: v3.create(2.0/16.0, 2.0, 2.0/16.0)
    };

    drawBufferWithShader(gl.LINES, gridBuffer, uniforms, shaderManager.unshadedProgram);
}


function drawBufferWithShader(drawMode, buffer, uniforms, shader) {
    gl.useProgram(shader.program);
    twgl.setBuffersAndAttributes(gl, shader, buffer);
    twgl.setUniforms(shader, uniforms);
    gl.drawElements(drawMode, buffer.numElements, gl.UNSIGNED_SHORT, 0);
}


function render(time) {

    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    camera.updateCameraPosition();
    drawGrid();
    
    for (const buffer_info of suzanne_right_buffers) {
        drawModel(buffer_info, v3.create(0.0, 0.0, 0.0));
    }

    for (const buffer_info of suzanne_left_buffers) {
        drawModel(buffer_info, v3.create(0.0, 0.0, 0.0));
    }

    //drawModel(buffer_infos[0], v3.create(0.0, 0.0, 0.0));
    
    //for (const buffer_info of buffer_infos) {
    //    drawModel(buffer_info, v3.create(0.0, 0.0, 0.0));
    //}
    

    requestAnimationFrame(render);
}

requestAnimationFrame(render);