# ObjToSchematic
A visual tool to convert .obj model files into Minecraft Schematics or [Litematica](https://www.curseforge.com/minecraft/mc-mods/litematica/files).

![Preview](/resources/preview3.png)

![Preview](/resources/preview2.jpg)

# Usage
You can either download the [latest release](https://github.com/LucasDower/ObjToSchematic/releases) or build it yourself by following the instructions below.

* Download and install [Node.js](https://nodejs.org/en/).
* Run `git clone https://github.com/LucasDower/ObjToSchematic.git` in your command line.
* Navigate to `/ObjToSchematic-main`.
* Run `npm install`.
* Run `npm start`.
* Note, for now, all .obj models **must** be triangulated before importing.

Support for choosing the block palette is not yet supported. Instead, you can edit `/tools/default-ignore-list.txt` to include blocks you don't want to be used and then run `npm run-script atlas`. You can also place custom textures in `/tools/blocks/` for more accurate block-colour matching when building with resource packs.

# Progress
[0.1](https://github.com/LucasDower/ObjToSchematic/releases/tag/v0.1-alpha)
* 🟢 **.json model loading**
* 🟢 **Model voxelisation**
* 🟢 **Optimised voxelisation & rendering overhaul**
* 🟢 **Basic .obj file loader UI**

[0.2](https://github.com/LucasDower/ObjToSchematic/releases/tag/v0.2-alpha)
* 🟠 <s>**Greedy voxel meshing**</s> (Removed)
* 🟢 **Export to schematic**

[0.3](https://github.com/LucasDower/ObjToSchematic/releases/tag/v0.3-alpha)
* 🟠 <s>**Voxel splitting**</s> (Removed)
* 🟢 **Ambient occlusion**
* 🟢 **Quality of life**
  * Model PSR, height limit warnings
* 🟢 **.mtl support for block choice**
  * PNG support, JPEG support
* 🟢 **Convert to TypeScript**

0.4
* 🟢 **Block choice exported**
  * Export to .litematic
* 🟢 **Support for non-uniform block models** (i.e. not all sides have same texture e.g. Oak Log, Crafting Table)
* 🟡 UI Redesign
  * Block palette option (choose blocks to export with)
  * Block assigner option
* 🟢 **Optimised ambient occlusion**
* 🟢 **Transition to ray-based voxelisation**
* 🟢 **Dithering**

0.5
* 🟡 Web workers (see [web-workers](https://github.com/LucasDower/ObjToSchematic/tree/web-workers))
  * Progress bar
* ⚪ Buffer refactor to support `OES_element_index_uint` WebGL extension (support for uint32 index buffers instead of uint16)
* ⚪ Node.js C++ addons
* ⚪ Alpha support
  * Alpha texture maps
  * Transparent blocks
* ⚪ Export to .nbt (structure blocks)
* ⚪ Import from .gltf

0.6
* ⚪ Block painting
* ⚪ Building guides
* ⚪ Slice viewer
* ⚪ .fbx import support
* ⚪ Support for non-block models (e.g. slabs, stairs, trapdoors, etc.)

# Disclaimer
:warning: This repo is in development and proper error handling is not currently my priority. Contributions are welcome.

This is an non-commercial **unofficial** tool that is neither approved, endorsed, associated, nor connected to Mojang Studios. Block textures used are from Minecraft and usage complies with the [Mojang Studios Brand And Assets Guidelines](https://account.mojang.com/terms#brand).

![MinecraftPreview](/resources/minecraft.png)

# Debugging
To allow for your favourite debugging tools like breakpoints and call stacks, I've included launch options for debugging in VSCode. Use `Ctrl+Shift+D`, and run "*Debug Main Process*" and once the Electron window has initialised, run "*Attach to Render Process*".
