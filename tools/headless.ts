import { Mesh } from '../src/mesh';
import { ObjImporter } from '../src/importers/obj_importer';
import { IVoxeliser } from '../src/voxelisers/base-voxeliser';
import { TVoxelOverlapRule, VoxelMesh } from '../src/voxel_mesh';
import { BlockMesh, BlockMeshParams, FallableBehaviour } from '../src/block_mesh';
import { IExporter} from '../src/exporters/base_exporter';
import { TextureFiltering } from '../src/texture';
import { ColourSpace } from '../src/util';
import { log, LogStyle } from './logging';
import { headlessConfig } from './headless-config';
import { TBlockAssigners } from '../src/block_assigner';
import { TVoxelisers, VoxeliserFactory } from '../src/voxelisers/voxelisers';
import { VoxeliseParams } from '../src/voxelisers/voxelisers';
import { ExporterFactory, TExporters } from '../src/exporters/exporters';

export type THeadlessConfig = {
    import: {
        absoluteFilePathLoad: string,
    },
    voxelise: {
        voxeliser: TVoxelisers,
        voxelMeshParams: {
            desiredHeight: number
            useMultisampleColouring: boolean,
            textureFiltering: TextureFiltering,
            voxelOverlapRule: TVoxelOverlapRule,
        },
    },
    palette: {
        blockMeshParams: {
            textureAtlas: string,
            blockPalette: string,
            blockAssigner: TBlockAssigners,
            colourSpace: ColourSpace,
            fallable: FallableBehaviour,
        },
    },
    export: {
        absoluteFilePathSave: string,
        exporter: TExporters,
    },
}

void async function main() {
    const mesh = _import({
        absoluteFilePathLoad: headlessConfig.import.absoluteFilePathLoad,
    });
    const voxelMesh = _voxelise(mesh, {
        voxeliser: VoxeliserFactory.GetVoxeliser(headlessConfig.voxelise.voxeliser),
        voxeliseParams: {
            desiredHeight: headlessConfig.voxelise.voxelMeshParams.desiredHeight,
            useMultisampleColouring: headlessConfig.voxelise.voxelMeshParams.useMultisampleColouring,
            textureFiltering: headlessConfig.voxelise.voxelMeshParams.textureFiltering,
            enableAmbientOcclusion: false,
            voxelOverlapRule: headlessConfig.voxelise.voxelMeshParams.voxelOverlapRule,
            calculateNeighbours: false,
        },
    });
    const blockMesh = _palette(voxelMesh, {
        blockMeshParams: {
            textureAtlas: headlessConfig.palette.blockMeshParams.textureAtlas,
            blockPalette: headlessConfig.palette.blockMeshParams.blockPalette,
            blockAssigner: headlessConfig.palette.blockMeshParams.blockAssigner as TBlockAssigners,
            colourSpace: headlessConfig.palette.blockMeshParams.colourSpace,
            fallable: headlessConfig.palette.blockMeshParams.fallable as FallableBehaviour,
        },
    });
    _export(blockMesh, {
        absoluteFilePathSave: headlessConfig.export.absoluteFilePathSave,
        exporter: ExporterFactory.GetExporter(headlessConfig.export.exporter),
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
