precision mediump float;

uniform mat4 u_worldViewProjection;
uniform sampler2D u_texture;
uniform float u_voxelSize;
uniform vec3 u_gridOffset;
uniform bool u_nightVision;
uniform float u_sliceHeight;

attribute vec3 position;
attribute vec3 normal;
attribute vec4 occlusion;
attribute vec2 texcoord;
attribute vec2 blockTexcoord;
attribute vec3 blockPosition;
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

    v_sliced = blockPosition.y > u_sliceHeight ? 1.0 : 0.0;

    // Disable ambient occlusion on the top layer of the slice view
    bool isBlockOnTopLayer = (v_sliced < 0.5 && abs(blockPosition.y - u_sliceHeight) < 0.5);
    if (isBlockOnTopLayer)
    {

        if (normal.y > 0.5)
        {
            v_occlusion = vec4(1.0, 1.0, 1.0, 1.0);
        }
        else if (normal.x > 0.5 || normal.z > 0.5 || normal.x < -0.5 || normal.z < -0.5)
        {
            v_occlusion = vec4(1.0, v_occlusion.y, 1.0, v_occlusion.w);
        }
    }

    gl_Position = u_worldViewProjection * vec4((position + u_gridOffset) * u_voxelSize, 1.0);
}
