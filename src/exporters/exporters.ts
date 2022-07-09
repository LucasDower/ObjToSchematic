import { IExporter } from './base_exporter';
import { Schematic } from './schematic_exporter';
import { Litematic } from './litematic_exporter';
import { ASSERT } from '../util';
import { ObjExporter } from './obj_exporter';
import { SchemExporter } from './schem_exporter';

export type TExporters = 'schematic' | 'litematic' | 'obj' | 'schem';

export class ExporterFactory {
    public static GetExporter(voxeliser: TExporters): IExporter {
        switch (voxeliser) {
            case 'schematic':
                return new Schematic();
            case 'litematic':
                return new Litematic();
            case 'obj':
                return new ObjExporter();
            case 'schem':
                return new SchemExporter();
            default:
                ASSERT(false);
        }
    }
}
