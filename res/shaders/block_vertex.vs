precision mediump float;

uniform mat4 u_worldViewProjection;
uniform sampler2D u_texture;
uniform float u_voxelSize;
uniform vec3 u_gridOffset;

attribute vec3 position;
attribute vec3 normal;
attribute vec4 occlusion;
attribute vec2 texcoord;
attribute vec2 blockTexcoord;

varying float v_lighting;
varying vec4 v_occlusion;
varying vec2 v_texcoord;
varying vec2 v_blockTexcoord;

vec3 light = vec3(0.78, 0.98, 0.59);

void main() {
    v_texcoord = texcoord;
    v_occlusion = occlusion;
    v_blockTexcoord = blockTexcoord;
    v_lighting = dot(light, abs(normal));

    gl_Position = u_worldViewProjection * vec4((position.xyz + u_gridOffset) * u_voxelSize, 1.0);
}
