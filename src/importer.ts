import { Mesh } from './mesh';
import { Warnable } from './util';

export abstract class IImporter extends Warnable {
    abstract createMesh(filePath: string): Mesh;
}
