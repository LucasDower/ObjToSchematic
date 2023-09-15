import { RGBA } from './colour';
import { AppTypes, AppUtil, UV } from './util';
import { ASSERT } from './util/error_util';

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

    private constructor() {
        this._blocks = new Map<AppTypes.TNamespacedBlockName, TAtlasBlock>();
        this._atlasSize = 0;
    }

    public getBlocks() {
        return this._blocks;
    }

    public getAtlasSize(): number {
        return this._atlasSize;
    }

    public hasBlock(blockName: AppTypes.TNamespacedBlockName): boolean {
        return this._blocks.has(blockName);
    }

    public static load(atlasJSON: any): Atlas {
        ASSERT(atlasJSON.formatVersion === 3, `The loaded atlas file uses an outdated format and needs to be recreated`);

        const atlas = new Atlas();

        const atlasData = atlasJSON;
        atlas._atlasSize = atlasData.atlasSize;

        const getTextureUV = (name: string) => {
            const tex = atlasData.textures[name];
            return {
                u: (3 * tex.atlasColumn + 1) / (atlas._atlasSize * 3),
                v: (3 * tex.atlasRow + 1) / (atlas._atlasSize * 3),
            };
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
}
