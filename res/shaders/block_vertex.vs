precision mediump float;

uniform mat4 u_worldViewProjection;
uniform sampler2D u_texture;
uniform float u_voxelSize;
uniform vec3 u_gridOffset;
uniform bool u_nightVision;
uniform float u_sliceHeight;
uniform vec3 u_boundsMin;
uniform vec3 u_boundsMax;

attribute vec3 position;
attribute vec3 normal;
attribute vec4 occlusion;
attribute vec2 texcoord;
attribute vec2 blockTexcoord;
attribute float lighting;

varying float v_lighting;
varying vec4 v_occlusion;
varying vec2 v_texcoord;
varying vec2 v_blockTexcoord;
varying float v_blockLighting;
varying float v_sliced;

vec3 light = vec3(0.78, 0.98, 0.59);

void main() {
    v_texcoord = texcoord;
    v_occlusion = occlusion;
    v_blockTexcoord = blockTexcoord;
    v_lighting = dot(light, abs(normal));
    v_blockLighting = lighting;

    if(u_sliceHeight > 0.0 && (position.y + u_gridOffset.y) >= (u_sliceHeight + u_boundsMin.y))
    {
        v_sliced = 1.0;
    } else {
        v_sliced = 0.0;
    }

    gl_Position = u_worldViewProjection * vec4((position.xyz + u_gridOffset) * u_voxelSize, 1.0);
}
