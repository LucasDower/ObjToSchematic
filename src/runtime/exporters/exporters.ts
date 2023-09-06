import { IExporter } from './base_exporter';
import { IndexedJSONExporter } from './indexed_json_exporter ';
import { Litematic } from './litematic_exporter';
import { NBTExporter } from './nbt_exporter';
import { SchemExporter } from './schem_exporter';
import { Schematic } from './schematic_exporter';
import { UncompressedJSONExporter } from './uncompressed_json_exporter';

export type TExporters =
    'schematic' |
    'litematic' |
    'schem' |
    'nbt' |
    'uncompressed_json' |
    'indexed_json';

export class ExporterFactory {
    public static GetExporter(voxeliser: TExporters): IExporter {
        switch (voxeliser) {
            case 'schematic':
                return new Schematic();
            case 'litematic':
                return new Litematic();
            case 'schem':
                return new SchemExporter();
            case 'nbt':
                return new NBTExporter();
            case 'uncompressed_json':
                return new UncompressedJSONExporter();
            case 'indexed_json':
                return new IndexedJSONExporter();
        }
    }
}
