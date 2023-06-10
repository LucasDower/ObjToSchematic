precision mediump float;

uniform mat4 u_worldViewProjection;
uniform float u_voxelSize;
uniform vec3 u_gridOffset;
uniform bool u_ambientOcclusion;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 texcoord;
attribute float occlusionOffsets;

attribute vec3 instancePosition;
attribute vec4 instanceColour;
attribute float instanceOcclusionOriginPixelIndex;
/*
attribute vec3 position;
attribute vec3 normal;
attribute vec4 colour;
attribute vec4 occlusion;
attribute vec2 texcoord;
*/

varying float v_lighting;
//varying vec4 v_occlusion;
varying vec2 v_texcoord;
varying vec4 v_colour;
varying float v_occlusionOriginPixelIndex;
varying float v_occlusionOffsets;

vec3 light = vec3(0.78, 0.98, 0.59);

void main() {
    v_lighting = dot(light, abs(normal));
    //v_occlusion = occlusion;
    v_texcoord = texcoord;
    v_colour = instanceColour;
    v_occlusionOriginPixelIndex = instanceOcclusionOriginPixelIndex;
    v_occlusionOffsets = occlusionOffsets;

    gl_Position = u_worldViewProjection * vec4((position.xyz + instancePosition.xyz + u_gridOffset) * u_voxelSize, 1.0);
}
