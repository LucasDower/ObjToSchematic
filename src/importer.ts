import { Mesh } from './mesh';
import { Warnable } from './util';

export abstract class IImporter extends Warnable {
    abstract parseFile(filePath: string): void;
    abstract toMesh(): Mesh;
}
