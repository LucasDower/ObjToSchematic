import { Mesh } from '../src/mesh';
import { ObjImporter } from '../src/importers/obj_importer';
import { IVoxeliser } from '../src/voxelisers/base-voxeliser';
import { TVoxelOverlapRule, VoxelMesh } from '../src/voxel_mesh';
import { BlockMesh, BlockMeshParams, FallableBehaviour } from '../src/block_mesh';
import { IExporter} from '../src/exporters/base_exporter';
import { Schematic } from '../src/exporters/schematic_exporter';
import { Litematic } from '../src/exporters/litematic_exporter';
import { RayVoxeliser } from '../src/voxelisers/ray-voxeliser';
import { NormalCorrectedRayVoxeliser } from '../src/voxelisers/normal-corrected-ray-voxeliser';
import { TextureFiltering } from '../src/texture';
import { ColourSpace } from '../src/util';
import { log, LogStyle } from './logging';
import { headlessConfig } from './headless-config';
import { VoxeliseParams } from '../src/voxelisers/voxelisers';

void async function main() {
    const mesh = _import({
        absoluteFilePathLoad: headlessConfig.import.absoluteFilePathLoad,
    });
    const voxelMesh = _voxelise(mesh, {
        voxeliser: headlessConfig.voxelise.voxeliser === 'raybased' ? new RayVoxeliser() : new NormalCorrectedRayVoxeliser(),
        voxeliseParams: {
            desiredHeight: headlessConfig.voxelise.voxeliseParams.desiredHeight,
            useMultisampleColouring: headlessConfig.voxelise.voxeliseParams.useMultisampleColouring,
            textureFiltering: headlessConfig.voxelise.voxeliseParams.textureFiltering === 'linear' ? TextureFiltering.Linear : TextureFiltering.Nearest,
            enableAmbientOcclusion: false,
            voxelOverlapRule: headlessConfig.voxelise.voxeliseParams.voxelOverlapRule as TVoxelOverlapRule,
            calculateNeighbours: false,
        },
    });
    const blockMesh = _palette(voxelMesh, {
        blockMeshParams: {
            textureAtlas: headlessConfig.palette.blockMeshParams.textureAtlas,
            blockPalette: headlessConfig.palette.blockMeshParams.blockPalette,
            ditheringEnabled: headlessConfig.palette.blockMeshParams.ditheringEnabled,
            colourSpace: headlessConfig.palette.blockMeshParams.colourSpace === 'rgb' ? ColourSpace.RGB : ColourSpace.LAB,
            fallable: headlessConfig.palette.blockMeshParams.fallable as FallableBehaviour,
        },
    });
    _export(blockMesh, {
        absoluteFilePathSave: headlessConfig.export.absoluteFilePathSave,
        exporter: headlessConfig.export.exporter === 'schematic' ? new Schematic() : new Litematic(),
    });
    log(LogStyle.Success, 'Finished!');
}();

interface ImportParams {
    absoluteFilePathLoad: string;
}

interface ActionVoxeliseParams {
    voxeliser: IVoxeliser;
    voxeliseParams: VoxeliseParams;
}

interface PaletteParams {
    blockMeshParams: BlockMeshParams;
}

interface ExportParams {
    absoluteFilePathSave: string;
    exporter: IExporter;
}

// TODO: Log status messages
function _import(params: ImportParams): Mesh {
    log(LogStyle.Info, 'Importing...');
    const importer = new ObjImporter();
    importer.parseFile(params.absoluteFilePathLoad);
    const mesh = importer.toMesh();
    mesh.processMesh();
    return mesh;
}

// TODO: Log status messages
function _voxelise(mesh: Mesh, params: ActionVoxeliseParams): VoxelMesh {
    log(LogStyle.Info, 'Voxelising...');
    const voxeliser: IVoxeliser = params.voxeliser;
    return voxeliser.voxelise(mesh, params.voxeliseParams);
}

// TODO: Log status messages
function _palette(voxelMesh: VoxelMesh, params: PaletteParams): BlockMesh {
    log(LogStyle.Info, 'Assigning blocks...');
    return BlockMesh.createFromVoxelMesh(voxelMesh, params.blockMeshParams);
}

// TODO: Log status messages
function _export(blockMesh: BlockMesh, params: ExportParams) {
    log(LogStyle.Info, 'Exporting...');
    params.exporter.export(blockMesh, params.absoluteFilePathSave);
}
