<h1>
  <p align="center">
    <img src="res/static/icon.png" alt="Logo" width="64" height="64"><br>
    ObjToSchematic<br>
  </p>
</h1>
<p align="center">
  A visual tool to convert 3D .obj models into Minecraft structures (.schematic, <a href="https://www.curseforge.com/minecraft/mc-mods/litematica/files">.litematic</a>, <a href="https://github.com/SpongePowered/Schematic-Specification">.schem</a>, .nbt)
  <br>
  <a href="#usage">Usage</a> •
  <a href="https://github.com/LucasDower/ObjToSchematic/releases/latest">Download</a> •
  <a href="#progress">Progress</a> •
  <a href="#disclaimer">Disclaimer</a> •
  <a href="https://discord.gg/McS2VrBZPD">Discord</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#gallery">Gallery</a> •
  <a href="#documentation">Documentation</a>
</p>
<p align="center">
  <img src="https://github.com/LucasDower/ObjToSchematic/actions/workflows/build.js.yml/badge.svg" alt="Logo">
  <img src="https://github.com/LucasDower/ObjToSchematic/actions/workflows/tests.js.yml/badge.svg" alt="Logo">
  <img src="https://img.shields.io/github/downloads/LucasDower/ObjToSchematic/total.svg" alt="Logo">
</p>

<p align="center">
  <img src="res/samples/noodles.png" alt="Noodles">
  <sub>"Noodle Bowl - 3DDecember Day9" (https://skfb.ly/orI9z) by Batuhan13<br>is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).</sub>
</p>

## Usage
You can either download the [latest release](https://github.com/LucasDower/ObjToSchematic/releases) or if you want the latest features you can build it yourself by following the instructions below.

* Download and install [Node.js](https://nodejs.org/en/).
* Run `git clone https://github.com/LucasDower/ObjToSchematic.git` in your command line.
* Navigate to `/ObjToSchematic-main`.
* Run `npm install`.
* Run `npm start`.

<p align="center">
  <img src="res/samples/editor.png">
  <sub>"Cut Fish" (https://skfb.ly/orWLC) by Suushimi<br>is licensed under Creative Commons Attribution-NonCommercial (http://creativecommons.org/licenses/by-nc/4.0/).</sub>
</p>

### Advanced

#### Block Palettes
You can create your own block palettes to fit the build you desire. When you select this palette, the generated structure will only use the blocks defined in your palette. To create a palette, list every block you want to use in `/tools/new-palette-blocks`. A list of every supported block can be found in `/tools/all-supported-blocks`. When your list is complete, run `npm run palette`, (make sure you run `npm run build` before  the first time you do this). If everything is successful, the next time you run the program you'll be able to select your new palette in the 'Block palette' dropdown.

#### Texture Atlases
If you play Minecraft with a resource pack, you will probably want to build your own texture atlas. This way the program will use the same resource pack for its visualisation and more accurate colour-to-block conversions can be made. To do this, run `npm run atlas` (make sure you run `npm run build` before the first time you do this) and follow the instructions. If everything is successful, the next time you run the program you'll be able to select your resource pack in the 'Texture atlas' dropdown.

#### Headless
If you want to use the program without using the GUI, you can edit `/tools/headless-config.ts` and run `npm run headless` (make sure to run `npm run build` after **each time** you edit the `headless-config.ts`).

## Progress
The progress tracker and remaining to-dos are now maintained in the [Discord](https://discord.gg/McS2VrBZPD) server's #to-do channel.

## Disclaimer
This is an non-commercial **unofficial** tool that is neither approved, endorsed, associated, nor connected to Mojang Studios. Block textures used are from Minecraft and usage complies with the [Mojang Studios Brand And Assets Guidelines](https://account.mojang.com/terms#brand).

![MinecraftPreview](https://i.imgur.com/LhTZ4G9.png)

## Contributing
Any contributions are welcome, just fork and submit a PR! Just make sure the code style follows the rulings in the `.eslintrc.json` by running `npm run lint` and the tests all pass by running `npm test`.

Currently there's not much docs but if you're looking for where to get started, look at `app_context.ts` and follow `_import()`, `_voxelise()`, `_assign()`, and `_export()`. If you're looking to add elements to the UI, look at `ui/layout.ts`, I'm not using a UI framework because I'm a nutter. Adding more file formats to import from and export to would be nice. Adding new default block palettes would be great also.

If you have any questions or need help getting started then feel free to join the [Discord](https://discord.gg/McS2VrBZPD) or message me **SinJi#4165**.

### Debugging
To allow for your favourite debugging tools like breakpoints and call stacks, I've included launch options for debugging in [VSCode](https://code.visualstudio.com/). **Be sure to use `npm run debug` instead of `npm start`** as this will disable the worker thread allowing you to add breakpoints anywhere in the code. Once the editor is running run "*Attach to Render Process*" and VSCode will hook to the Chromium debugger.

## Gallery
<p align="center">
  <img src="https://i.imgur.com/wmNQnkN.png" alt="Gallery1" width="600"><br>
  <sub>"Creepy Lady Bust Statue Scan" (https://skfb.ly/6B7pK) by alex.toporowicz is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).</sub>
  <br>
  <img src="https://imgur.com/SF33FGa.png" alt="Gallery3" width="600"><br>
  <sub>"Pivot Demo: Journey" (https://skfb.ly/6WCIJ) by Sketchfab is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).</sub>
  <br>
  <img src="https://imgur.com/7domJdr.png" alt="Gallery4" width="600"><br>
  <sub>"Handpainted Pancake" (https://skfb.ly/6T7yN) by Marvi is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).</sub>
</p>

## Documentation
Below is a detailed explanation into what each configurable setting does divided into each step in the program.

### Import
* **Wavefront .obj file** - This is the actual 3D model you want to voxelise. Please note that the more complex your model is the longer it will take to voxelise. It is strongly recommended that you simplify your geometry in a program such as Blender to reduce the poly count. If your triangles are smaller than the size of the voxels then you will not notice the difference and the extra detail is just wasting resources.
* **Rotation** - Change to rotate the mesh, requires clicking 'Load mesh' to update.

### Materials
Here is where you can edit the materials that the loaded model uses. Any changes you make require you to commit the changes by clicking 'Update materials'.
* **Type** - Switch between a Solid material or a Textured material. Note, only materials that're used by triangles with defined texcoords can be turned into Textured materials.
* Solid Materials
  * **Colour** - The actual colour of the material.
  * **Alpha** - The transparency value.
* Textured Materials
  * **Diffuse map** - The actual texture file the colour data is from.
  * **[Filtering](https://en.wikipedia.org/wiki/Texture_filtering)** - How pixel values are sampled.
  * **[Wrap](https://en.wikipedia.org/wiki/Wrapping_(graphics))** - How texcoords outside the [0, 1] range are sampled.
  * **Transparency** - How transparency values are sampled, either 'None' for opaque, 'Alpha map' for custom alpha mask textures, 'Alpha constant' for a flat transparency value or 'Use diffuse map alpha channel'.

### Voxelise
* **Constraint axis** - This determines which axis is used to determine the size of the model. If you choose 'Y' and type in a size of 80 then the voxelised mesh will has a height of 80. If you choose 'X' instead then the width will be 80.
* **Size** - This works in conjunction with *Constraint axis* as described above.
* **Algorithm** - There are many ways to turn a triangle mesh into a voxel mesh and each method produces different results. Here you can choose which one you like the best.
* **Ambient occlusion** - This is a purely visual setting and makes no difference to the outputted structure. [Ambient occlusion](https://en.wikipedia.org/wiki/Ambient_occlusion) displays the shadows between adjacent blocks just like Minecraft. This takes quite a hit to the time to voxelise so consider turning this setting off first.
* **Multisampling** - Multisampling should only be used if your mesh uses textures. It takes multiple samples of the texture to get a more representative colour for a voxel. If your triangles and voxels are a similar size then you'll want this on. If your voxels are much smaller than the triangles then you'll probably not notice the difference this makes unless your texture is very noisey.
* **Voxel overlap** - When two triangles next to each other are voxelised one after another the second triangle may place voxels in positions where the first triangle has already placed a voxel. This setting allows you to only take the *First* voxel colour or take an *Average*.

### Assign
* **Texture atlas** - The textures to use for each block. This also determines how colour-conversions are made.
* **Block palette** - What collection of blocks are available to choose from.
* **Dithering** - *An [image](https://en.wikipedia.org/wiki/Dither) speaks a thousand words.*
* **Fallable blocks** - There's a chance a block is placed such as Sand which when actually placed is going to fall under gravity. You probably don't want this to happen so *Replace falling with solid* will substitute the falling block for a similarly coloured block. Alternatively, you can *Do nothing* or replace any gravity-effected block with *Replace fallable with solid*.
* **Colour accuracy** - This bins together similar colours to speed up colour-to-block conversions. This is a logarithmic scale.
* **Smart averaging** - When performing colour-to-block conversions only block faces that are visible are used in calculating the 'average' face colour. There's no reason to turn this off apart from it being slower.
* **Smoothness** - A high smoothness value will prevent block with noisey textures being used. This is very sensitive to small changes. High smoothness values will decrease the colour accuracy as under-the-hood it is trading off colour error for std error.
* **Calculate lighting** - Turn this on if you want don't want night-vision in the editor. Only turn this on if you really need it as it is considerably slower.
* **Light threshold** - Requires *Calculate lighting* to be on. Will place light blocks (not the [Light Block](https://minecraft.fandom.com/wiki/Light_Block)) in places where the light value is less than the threshold. Useful in automatically lighting up the dark areas of your structure.

### Export
* **File format** - The format to save your structure to. The [Litematica](https://www.curseforge.com/minecraft/mc-mods/litematica) format is strongly recommended and is significantly faster to export to for large structures. The Schematic exporter is useful if you still play in 1.12 as it uses the old block ID system before The Flattening, however many new blocks cannot be encoded in this format so they will be turned into Stone blocks. The NBT exporter is used for Minecraft's [structure blocks](https://minecraft.fandom.com/wiki/Structure_Block). The OBJ exporter can be used to render your structres in a program such as Blender.
