import { RGBA } from '../runtime/colour';
import { UV } from './util';

export interface TextureInfo {
    name: string
    texcoord: UV
}

export interface FaceInfo {
    [face: string]: TextureInfo,
    up: TextureInfo,
    down: TextureInfo,
    north: TextureInfo,
    south: TextureInfo,
    east: TextureInfo,
    west: TextureInfo
}

export interface BlockInfo {
    name: string;
    colour: RGBA;
    faces: FaceInfo
}
