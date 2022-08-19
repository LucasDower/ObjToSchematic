import { UV, ASSERT, fileExists, ColourSpace, ATLASES_DIR, PALETTES_DIR, AppError, LOG_WARN } from './util';

import fs from 'fs';
import path from 'path';
import { StatusHandler } from './status';
import { RGBA, RGBAUtil } from './colour';
import { Palette } from './palette';
import { Atlas } from './atlas';

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

/*
/* eslint-enable */
export class BlockAtlas {
    private _atlas?: Atlas;
    private _palette?: Palette;

    private static _instance: BlockAtlas;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
    }

    public loadAtlas(atlasID: string) {
        this._atlas = Atlas.load(atlasID);
    }

    public loadPalette(paletteName: string) {
        this._palette = Palette.load(paletteName);
    }

    public getBlock(voxelColour: RGBA, colourSpace: ColourSpace, exclude?: string[]): BlockInfo {
        ASSERT(this._atlas !== undefined, 'Atlas not defined');
        ASSERT(this._palette !== undefined, 'Palette not defined');

        const block = this._atlas.getBlock(voxelColour, this._palette, exclude);
        return block;
    }

    public getAtlasSize() {
        ASSERT(this._atlas !== undefined);
        return this._atlas.getAtlasSize();
    }

    public getAtlasTexturePath() {
        ASSERT(this._atlas !== undefined, 'Atlas not defined');
        return this._atlas.getAtlasTexturePath();
    }
}
