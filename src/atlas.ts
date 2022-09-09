import { AppTypes, AppUtil, ATLASES_DIR, TOptional, UV } from './util';

import fs from 'fs';
import path from 'path';
import { RGBA } from './colour';
import { ASSERT } from './util/error_util';
import { LOG } from './util/log_util';

export type TAtlasBlockFace = {
    name: string;
    texcoord: UV;
}

export type TAtlasBlock = {
    name: string;
    colour: RGBA;
    faces: {
        up: TAtlasBlockFace,
        down: TAtlasBlockFace,
        north: TAtlasBlockFace,
        east: TAtlasBlockFace,
        south: TAtlasBlockFace,
        west: TAtlasBlockFace,
    };
}

/**
 * Atlases, unlike palettes, are not currently designed to be user-facing or
 * programmatically created. This class simply facilitates loading .atlas
 * files.
 */
export class Atlas {
    public static ATLAS_NAME_REGEX: RegExp = /^[a-zA-Z\-]+$/;
    private static _FILE_VERSION: number = 1;
    
    private _blocks: Map<AppTypes.TNamespacedBlockName, TAtlasBlock>;
    private _atlasSize: number;
    private _atlasName: string;

    private constructor(atlasName: string) {
        this._blocks = new Map<AppTypes.TNamespacedBlockName, TAtlasBlock>();
        this._atlasSize = 0;
        this._atlasName = atlasName;
    }

    public getBlocks() {
        return this._blocks;
    }

    public static load(atlasName: string): TOptional<Atlas> {
        if (!Atlas._isValidAtlasName(atlasName)) {
            return;
        }

        const atlasPath = Atlas._getAtlasPath(atlasName);
        LOG(atlasPath);
        if (!fs.existsSync(atlasPath)) {
            return;
        }

        const atlas = new Atlas(atlasName);

        const atlasFile = fs.readFileSync(atlasPath, 'utf8');
        const atlasJSON = JSON.parse(atlasFile);
        const atlasVersion = atlasJSON.version;

        if (atlasVersion === undefined || atlasVersion === 1) {
            const atlasSize = atlasJSON.atlasSize as number;
            atlas._atlasSize = atlasSize;

            const blocks = atlasJSON.blocks;
            for (const block of blocks) {
                const atlasBlock = block as TAtlasBlock;
                atlasBlock.name = AppUtil.Text.namespaceBlock(atlasBlock.name);
                atlas._blocks.set(atlasBlock.name, atlasBlock);
            }
        } else {
            ASSERT(false, `Unrecognised .atlas file version: ${atlasVersion}`);
        }

        return atlas;
    }

    public getAtlasSize(): number {
        return this._atlasSize;
    }

    public getAtlasTexturePath() {
        return path.join(ATLASES_DIR, `./${this._atlasName}.png`);
    }

    /*
    public getBlocks(): TAtlasBlock[] {
        return Array.from(this._blocks.values());
    }
    */

    public hasBlock(blockName: AppTypes.TNamespacedBlockName): boolean {
        return this._blocks.has(blockName);
    }

    public static getVanillaAtlas(): TOptional<Atlas> {
        return Atlas.load('vanilla');
    }

    private static _isValidAtlasName(atlasName: string): boolean {
        return atlasName.length > 0 && Atlas.ATLAS_NAME_REGEX.test(atlasName);
    }

    private static _getAtlasPath(atlasName: string): string {
        return path.join(ATLASES_DIR, `./${atlasName}.atlas`);
    }
}
