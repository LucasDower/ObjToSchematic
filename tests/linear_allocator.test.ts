import { LinearAllocator } from '../src/linear_allocator';
import { Vector3 } from '../src/vector';
import { TEST_PREAMBLE } from './preamble';

test('RegExpBuilder', () => {
    TEST_PREAMBLE();

    const vec = new LinearAllocator<Vector3>(() => {
        return new Vector3(0, 0, 0);
    });

    expect(vec.size()).toBe(0);
    expect(vec.max()).toBe(0);
    const first = vec.place();
    first.x = 1;
    expect(vec.size()).toBe(1);
    expect(vec.max()).toBe(1);
    const second = vec.place();
    second.x = 2;
    expect(vec.size()).toBe(2);
    expect(vec.max()).toBe(2);
    vec.reset();
    expect(vec.size()).toBe(0);
    expect(vec.max()).toBe(2);
    const newFirst = vec.place();
    expect(newFirst.x).toBe(1);
});
