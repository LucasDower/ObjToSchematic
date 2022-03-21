# ObjToSchematic
A visual tool to convert .obj model files into Minecraft Schematics or [Litematica](https://www.curseforge.com/minecraft/mc-mods/litematica/files).

![Preview](https://i.imgur.com/w1GWPvT.png)
<sub>"Homo erectus georgicus" (https://skfb.ly/6ADT8) by Geoffrey Marchal is licensed under Creative Commons Attribution-NonCommercial (http://creativecommons.org/licenses/by-nc/4.0/).</sub>

## Usage
You can either download the [latest release](https://github.com/LucasDower/ObjToSchematic/releases) or build it yourself by following the instructions below.

* Download and install [Node.js](https://nodejs.org/en/).
* Run `git clone https://github.com/LucasDower/ObjToSchematic.git` in your command line.
* Navigate to `/ObjToSchematic-main`.
* Run `npm install`.
* Run `npm start`.

### Advanced

**Block Palettes** You can create your own block palettes to fit the build you desire. When you select this palette, the generated structure will only use the blocks defined in your palette. To create a palette, list every block you want to use in `/tools/new-palette-blocks`. A list of every supported block can be found in `/tools/all-supported-blocks`. When your list is complete, run `npm run palette`, (make sure you run `run run build` before  the first time you do this). If everything is successful, the next time you run the program you'll be able to select your new palette in the 'Block palette' dropdown.

**Texture Atlases** If you play Minecraft with a resource pack, you will probably want to build your own texture atlas. This way the program will use the same resource pack for its visualisation and more accurate colour-to-block conversions can be made. To do this, run `npm run atlas` (make sure you run `run run build` before the first time you do this) and follow the instructions. If everything is successful, the next time you run the program you'll be able to select your resource pack in the 'Texture atlas' dropdown.
## Progress
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

[0.4](https://github.com/LucasDower/ObjToSchematic/releases/tag/v0.4-alpha)
* 🟢 **Block choice exported**
  * Export to .litematic
* 🟢 **Support for non-uniform block models** (i.e. not all sides have same texture e.g. Oak Log, Crafting Table)
* 🟢 **UI Redesign**
* 🟢 **Optimised ambient occlusion**
* 🟢 **Transition to ray-based voxelisation**
* 🟢 **Dithering**

0.5
* ⚪ Support for simplifying complex meshes
* 🟢 **Load custom block palettes and texture atlases**
* 🟢 **Optimise construction of voxel mesh vertex buffers**
* 🟡 Web workers (see [web-workers](https://github.com/LucasDower/ObjToSchematic/tree/web-workers))
  * Progress bar
  * Prevent UI hanging
* 🟢 **Buffer refactor to support `OES_element_index_uint` WebGL extension (support for uint32 index buffers instead of uint16)**
* ⚪ Alpha support
  * Alpha texture maps
  * Transparent blocks
* ⚪ Export to .nbt (structure blocks)
* ⚪ Import from .gltf

0.6
* ⚪ Node.js C++ addons
* ⚪ Block painting
* ⚪ Building guides
* ⚪ Slice viewer
* ⚪ .fbx import support
* ⚪ Support for non-block models (e.g. slabs, stairs, trapdoors, etc.)

## Disclaimer
:warning: This repo is in development and proper error handling is not currently my priority. Contributions are welcome.

This is an non-commercial **unofficial** tool that is neither approved, endorsed, associated, nor connected to Mojang Studios. Block textures used are from Minecraft and usage complies with the [Mojang Studios Brand And Assets Guidelines](https://account.mojang.com/terms#brand).

![MinecraftPreview](https://i.imgur.com/LhTZ4G9.png)

## Contributing
Any contributions are welcome, just fork and submit a PR! Just make sure the code style follows the rulings in the `.eslintrc.json` and pass the CI build task.

Currently there's not much docs but if you're looking for where to get started, look at `app_context.ts` and follow `_import()`, `_simplify()`, `_voxelise()`, `_palette()`, and `_export()`. If you're looking to add elements to the UI, look at `ui/layout.ts`, I'm not using a UI framework because I'm a nutter. If you have any questions or need help getting started then feel free to message me.

Adding more file formats to import from and export to would be nice. Adding new default block palettes would be great also. 

### Debugging
To allow for your favourite debugging tools like breakpoints and call stacks, I've included launch options for debugging in VSCode. Use `Ctrl+Shift+D`, and run "*Debug Main Process*" and once the Electron window has initialised, run "*Attach to Render Process*".
