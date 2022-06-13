import { IExporter } from './base_exporter';
import { Schematic } from './schematic_exporter';
import { Litematic } from './litematic_exporter';
import { ASSERT } from '../util';
import { ObjExporter } from './obj_exporter';

export type TExporters = 'schematic' | 'litematic' | 'obj';

export class ExporterFactory {
    public static GetExporter(voxeliser: TExporters): IExporter {
        switch (voxeliser) {
            case 'schematic':
                return new Schematic();
            case 'litematic':
                return new Litematic();
            case 'obj':
                return new ObjExporter();
            default:
                ASSERT(false);
        }
    }
}
