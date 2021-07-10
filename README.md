# ObjToSchematic
A tool to convert .obj files into Minecraft Schematics

:warning: This repo is in development and proper error handling is not currently my priority. Contributions are welcome.

![Preview](/resources/preview.png)

![MinecraftPreview](/resources/minecraft.png)

![DebugPreview](/resources/debug_preview.png)

![MeshingPreview](/resources/greedy_meshing.png)


# Progress
[0.1](https://github.com/LucasDower/ObjToSchematic/releases/tag/v0.1-alpha)
* ✔️ **.json model loading**
* ✔️ **Model voxelisation**
* ✔️ **Optimised voxelisation & rendering overhaul**
* ✔️ **Basic .obj file loader UI**

[0.2](https://github.com/LucasDower/ObjToSchematic/releases/tag/v0.2-alpha)
* ✔️ **Greedy voxel meshing**
* ✔️ **Export to schematic**

0.3
* ✔️ ** Faster voxel splitting **
* Multithreading
* Quality of life
  * Model centreing, scaling, voxel size preview, progress bar, limit warnings

0.4
* Export to litematic
* .mtl support for block choice 

0.5
* Building guides
* Slice viewer
* .fbx support
* Block painting

# Usage
You can either download the [latest release](https://github.com/LucasDower/ObjToSchematic/releases) or build it yourself by following the instructions below.

* Download and install [Node.js](https://nodejs.org/en/).
* Execute `git clone https://github.com/LucasDower/ObjToSchematic.git` in your command line.
* Navigate to `/ObjToSchematic-main`.
* Run `npm install`.
* Run `npm start`.

