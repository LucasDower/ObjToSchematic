import { IExporter } from './base_exporter';
import { Schematic } from './schematic_exporter';
import { Litematic } from './litematic_exporter';
import { ASSERT } from '../util';

export type TExporters = 'schematic' | 'litematic';

export class ExporterFactory {
    public static GetExporter(voxeliser: TExporters): IExporter {
        switch (voxeliser) {
            case 'schematic':
                return new Schematic();
            case 'litematic':
                return new Litematic();
            default:
                ASSERT(false);
        }
    }
}
