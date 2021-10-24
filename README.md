# ObjToSchematic
A tool to convert .obj files into Minecraft Schematics.

![Preview](/resources/preview3.png)

![Preview](/resources/preview2.jpg)

![MinecraftPreview](/resources/minecraft.png)

# Progress
[0.1](https://github.com/LucasDower/ObjToSchematic/releases/tag/v0.1-alpha)
* ✔️ **.json model loading**
* ✔️ **Model voxelisation**
* ✔️ **Optimised voxelisation & rendering overhaul**
* ✔️ **Basic .obj file loader UI**

[0.2](https://github.com/LucasDower/ObjToSchematic/releases/tag/v0.2-alpha)
* ✔️ **Greedy voxel meshing**
* ✔️ **Export to schematic**

[0.3](https://github.com/LucasDower/ObjToSchematic/releases/tag/v0.3-alpha)
* ✔️ **Faster voxel splitting**
* ✔️ **Ambient occlusion**
* ✔️ **Quality of life**
  * ✔️ Model PSR, ✔️ height limit warnings
* ✔️ **.mtl support for block choice**
  * ✔️ PNG support, ✔️ JPEG support
* ✔️ **Convert to TypeScript**

0.4
* ⌛ Block choice exported
  * ✔️ **Export to .litematic**
  * Export to .nbt (structure blocks)
* Alpha support
  * Alpha texture maps
  * Transparent blocks
* ✔️ **Support for non-uniform block models** (i.e. not all sides have same texture e.g. Oak Log, Crafting Table)
* ⌛ UI Redesign (use an actual UI framework) (see [redesign](https://github.com/LucasDower/ObjToSchematic/tree/redesign))
  * Block palette (choose blocks to export with)
  * Options for toggling fallable blocks
* Buffer refactor to support `OES_element_index_uint` WebGL extension (support for uint32 index buffers instead of uint16)

0.5
* ⌛ Multithreading (see [web-workers](https://github.com/LucasDower/ObjToSchematic/tree/web-workers))
  * Progress bar
* Node.js C++ addons

0.6
* Block painting
* Building guides
* Slice viewer
* .fbx import support
* Support for non-block models (e.g. slabs, stairs, trapdoors, etc.)

# Usage
You can either download the [latest release](https://github.com/LucasDower/ObjToSchematic/releases) or build it yourself by following the instructions below.

* Download and install [Node.js](https://nodejs.org/en/).
* Run `git clone https://github.com/LucasDower/ObjToSchematic.git` in your command line.
* Navigate to `/ObjToSchematic-main`.
* Run `npm install`.
* Run `npm start`.

Support for choosing the block palette is not yet supported. Instead, you can rebuild blocks.json with `npm run-script atlas` using only the blocks you want to export with. This also means you can use custom texture packs to get more accurate block-colour matching.


![](https://i.imgur.com/BTj9gAx.gif)

# Disclaimer
:warning: This repo is in development and proper error handling is not currently my priority. Contributions are welcome.

This is an non-commercial **unofficial** tool that is neither approved, endorsed, associated, nor connected to Mojang Studios. Block textures used are from Minecraft and usage complies with the [Mojang Studios Brand And Assets Guidelines](https://account.mojang.com/terms#brand).

![DebugPreview](/resources/debug_preview.png)

![MeshingPreview](/resources/greedy_meshing.png)
