export namespace AppConstants {
    export const FACES_PER_VOXEL = 6;
    export const VERTICES_PER_FACE = 4;
    export const INDICES_PER_VOXEL = 24;
    export const COMPONENT_PER_SIZE_OFFSET = FACES_PER_VOXEL * VERTICES_PER_FACE;

    export namespace ComponentSize {
        export const LIGHTING = 1;
        export const TEXCOORD = 2;
        export const POSITION = 3;
        export const COLOUR = 4;
        export const NORMAL = 3;
        export const INDICES = 3;
        export const OCCLUSION = 4;
    }

    export namespace VoxelMeshBufferComponentOffsets {
        export const LIGHTING = ComponentSize.LIGHTING * COMPONENT_PER_SIZE_OFFSET;
        export const TEXCOORD = ComponentSize.TEXCOORD * COMPONENT_PER_SIZE_OFFSET;
        export const POSITION = ComponentSize.POSITION * COMPONENT_PER_SIZE_OFFSET;
        export const COLOUR = ComponentSize.COLOUR * COMPONENT_PER_SIZE_OFFSET;
        export const NORMAL = ComponentSize.NORMAL * COMPONENT_PER_SIZE_OFFSET;
        export const INDICES = 36;
        export const OCCLUSION = ComponentSize.OCCLUSION * COMPONENT_PER_SIZE_OFFSET;
    }

    export const DATA_VERSION = 3105; // 1.19

    export const FALLABLE_BLOCKS = new Set([
        'minecraft:anvil',
        'minecraft:lime_concrete_powder',
        'minecraft:orange_concrete_powder',
        'minecraft:black_concrete_powder',
        'minecraft:brown_concrete_powder',
        'minecraft:cyan_concrete_powder',
        'minecraft:light_gray_concrete_powder',
        'minecraft:purple_concrete_powder',
        'minecraft:magenta_concrete_powder',
        'minecraft:light_blue_concrete_powder',
        'minecraft:yellow_concrete_powder',
        'minecraft:white_concrete_powder',
        'minecraft:blue_concrete_powder',
        'minecraft:red_concrete_powder',
        'minecraft:gray_concrete_powder',
        'minecraft:pink_concrete_powder',
        'minecraft:green_concrete_powder',
        'minecraft:dragon_egg',
        'minecraft:gravel',
        'minecraft:pointed_dripstone',
        'minecraft:red_sand',
        'minecraft:sand',
        'minecraft:scaffolding',
    ]);

    export const TRANSPARENT_BLOCKS = new Set([
        'minecraft:frosted_ice',
        'minecraft:glass',
        'minecraft:white_stained_glass',
        'minecraft:orange_stained_glass',
        'minecraft:magenta_stained_glass',
        'minecraft:light_blue_stained_glass',
        'minecraft:yellow_stained_glass',
        'minecraft:lime_stained_glass',
        'minecraft:pink_stained_glass',
        'minecraft:gray_stained_glass',
        'minecraft:light_gray_stained_glass',
        'minecraft:cyan_stained_glass',
        'minecraft:purple_stained_glass',
        'minecraft:blue_stained_glass',
        'minecraft:brown_stained_glass',
        'minecraft:green_stained_glass',
        'minecraft:red_stained_glass',
        'minecraft:black_stained_glass',
        'minecraft:ice',
        'minecraft:oak_leaves',
        'minecraft:spruce_leaves',
        'minecraft:birch_leaves',
        'minecraft:jungle_leaves',
        'minecraft:acacia_leaves',
        'minecraft:dark_oak_leaves',
        'minecraft:mangrove_leaves',
        'minecraft:azalea_leaves',
        'minecraft:flowering_azalea_leaves',
        'minecraft:slime_block',
        'minecraft:honey_block',
    ]);

    export const GRASS_LIKE_BLOCKS = new Set([
        'minecraft:grass_block',
        'minecraft:grass_path',
        'minecraft:podzol',
        'minecraft:crimson_nylium',
        'minecraft:warped_nylium',
        'minecraft:mycelium',
        'minecraft:farmland',
    ]);

    export const EMISSIVE_BLOCKS = new Set([
        'minecraft:respawn_anchor',
        'minecraft:magma_block',
        'minecraft:sculk_catalyst',
        'minecraft:crying_obsidian',
        'minecraft:shroomlight',
        'minecraft:sea_lantern',
        'minecraft:jack_o_lantern',
        'minecraft:glowstone',
        'minecraft:pearlescent_froglight',
        'minecraft:verdant_froglight',
        'minecraft:ochre_froglight',
    ]);
}