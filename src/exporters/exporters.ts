import { ASSERT } from '../util/error_util';
import { IExporter } from './base_exporter';
import { Litematic } from './litematic_exporter';
import { NBTExporter } from './nbt_exporter';
import { SchemExporter } from './schem_exporter';
import { Schematic } from './schematic_exporter';

export type TExporters = 'schematic' | 'litematic' | 'schem' | 'nbt';

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
            default:
                ASSERT(false);
        }
    }
}
