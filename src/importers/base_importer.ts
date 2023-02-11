import { Mesh } from '../mesh';

export abstract class IImporter {
    abstract parse(fileSource: string): void;
    abstract toMesh(): Mesh;
}
