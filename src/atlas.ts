import path from 'path';

import ATLAS_VANILLA from '../res/atlases/vanilla.atlas';
import { RGBA } from './colour';
import { AppTypes, AppUtil, TOptional, UV } from './util';
import { AppError, ASSERT } from './util/error_util';
import { LOG } from './util/log_util';
import { AppPaths } from './util/path_util';

export type TAtlasBlockFace = {
    name: string,
    texcoord: UV,
    colour: RGBA,
    std: number,
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
        ASSERT(atlasName === 'vanilla');

        const atlas = new Atlas(atlasName);

        const atlasJSON = JSON.parse(ATLAS_VANILLA);

        if (atlasJSON.formatVersion !== 3) {
            throw new AppError(`The '${atlasName}' texture atlas uses an outdated format and needs to be recreated`);
        }

        const atlasData = atlasJSON;
        atlas._atlasSize = atlasData.atlasSize;

        const getTextureUV = (name: string) => {
            const tex = atlasData.textures[name];
            return new UV(
                (3 * tex.atlasColumn + 1) / (atlas._atlasSize * 3),
                (3 * tex.atlasRow + 1) / (atlas._atlasSize * 3),
            );
        };

        for (const block of atlasData.blocks) {
            ASSERT(AppUtil.Text.isNamespacedBlock(block.name), 'Atlas block not namespaced');

            const atlasBlock: TAtlasBlock = {
                name: block.name,
                colour: block.colour,
                faces: {
                    up: {
                        name: block.faces.up,
                        texcoord: getTextureUV(block.faces.up),
                        std: atlasData.textures[block.faces.up].std,
                        colour: atlasData.textures[block.faces.up].colour,
                    },
                    down: {
                        name: block.faces.down,
                        texcoord: getTextureUV(block.faces.down),
                        std: atlasData.textures[block.faces.down].std,
                        colour: atlasData.textures[block.faces.down].colour,
                    },
                    north: {
                        name: block.faces.north,
                        texcoord: getTextureUV(block.faces.north),
                        std: atlasData.textures[block.faces.north].std,
                        colour: atlasData.textures[block.faces.north].colour,
                    },
                    east: {
                        name: block.faces.east,
                        texcoord: getTextureUV(block.faces.east),
                        std: atlasData.textures[block.faces.east].std,
                        colour: atlasData.textures[block.faces.east].colour,
                    },
                    south: {
                        name: block.faces.south,
                        texcoord: getTextureUV(block.faces.south),
                        std: atlasData.textures[block.faces.south].std,
                        colour: atlasData.textures[block.faces.south].colour,
                    },
                    west: {
                        name: block.faces.west,
                        texcoord: getTextureUV(block.faces.west),
                        std: atlasData.textures[block.faces.west].std,
                        colour: atlasData.textures[block.faces.west].colour,
                    },
                },
            };

            atlas._blocks.set(block.name, atlasBlock);
        }

        return atlas;
    }

    public getAtlasSize(): number {
        return this._atlasSize;
    }

    public getAtlasTexturePath() {
        return path.join(AppPaths.Get.atlases, `./${this._atlasName}.png`);
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
        return path.join(AppPaths.Get.atlases, `./${atlasName}.atlas`);
    }
}
