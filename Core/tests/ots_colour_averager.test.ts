import { OtS_ColourAverager, OtS_Colours } from '../src/colour';

test('Colour averager #1a', () => {
    const averager = OtS_ColourAverager.Create();
    averager.add(OtS_Colours.BLACK);
    averager.add(OtS_Colours.RED);

    const average = averager.compute();
    expect(average).toStrictEqual({ r: 0.5, g: 0.0, b: 0.0, a: 1.0 });
});

test('Colour averager #1b', () => {
    const average = OtS_ColourAverager.From(new Uint8ClampedArray([
        0, 0, 0, 255,
        255, 0, 0, 255
    ]));

    expect(average).toStrictEqual({ r: 0.5, g: 0.0, b: 0.0, a: 1.0 });
});

test('Colour averager #2a', () => {
    const averager = OtS_ColourAverager.Create();
    averager.add(OtS_Colours.RED);
    averager.add(OtS_Colours.RED);
    averager.add(OtS_Colours.RED);
    averager.add(OtS_Colours.RED);

    const average = averager.compute();
    expect(average).toStrictEqual({ r: 1.0, g: 0.0, b: 0.0, a: 1.0 });
});

test('Colour averager #2b', () => {
    const average = OtS_ColourAverager.From(new Uint8ClampedArray([
        255, 0, 0, 255,
        255, 0, 0, 255,
        255, 0, 0, 255,
        255, 0, 0, 255
    ]));

    expect(average).toStrictEqual({ r: 1.0, g: 0.0, b: 0.0, a: 1.0 });
});

test('Colour averager #3a', () => {
    const averager = OtS_ColourAverager.Create();
    averager.add(OtS_Colours.BLACK);
    averager.add(OtS_Colours.BLACK);

    const average = averager.compute();
    expect(average).toStrictEqual(OtS_Colours.BLACK);
});

test('Colour averager #3b', () => {
    const average = OtS_ColourAverager.From(new Uint8ClampedArray([
        0, 0, 0, 255,
        0, 0, 0, 255,
    ]));

    expect(average).toStrictEqual({ r: 0.0, g: 0.0, b: 0.0, a: 1.0 });
});

test('Colour averager #4a', () => {
    const averager = OtS_ColourAverager.Create();
    averager.add(OtS_Colours.RED);
    averager.add(OtS_Colours.GREEN);
    averager.add(OtS_Colours.BLUE);

    const average = averager.compute();
    expect(average).toStrictEqual({ r: 1/3, g: 1/3, b: 1/3, a: 1.0 });
});

test('Colour averager #4b', () => {
    const average = OtS_ColourAverager.From(new Uint8ClampedArray([
        255, 0, 0, 255,
        0, 255, 0, 255,
        0, 0, 255, 255,
    ]));

    expect(average).toStrictEqual({ r: 1/3, g: 1/3, b: 1/3, a: 1.0 });
});

test('Colour averager #5a', () => {
    const averager = OtS_ColourAverager.Create();
    averager.add(OtS_Colours.RED);

    const average = averager.compute();
    expect(average).toStrictEqual({ r: 1.0, g: 0.0, b: 0.0, a: 1.0 });
});

test('Colour averager #5b', () => {
    const data = new Uint8ClampedArray([
        255, 0, 0, 255
    ]);

    const average = OtS_ColourAverager.From(data);
    expect(average).toStrictEqual({ r: 1.0, g: 0.0, b: 0.0, a: 1.0 });
});

test('Colour averager #6a', () => {
    const averager = OtS_ColourAverager.Create();

    const average = averager.compute();
    expect(average.r).toBe(NaN);
    expect(average.g).toBe(NaN);
    expect(average.b).toBe(NaN);
    expect(average.a).toBe(NaN);
});

test('Colour averager #6b', () => {
    const data = new Uint8ClampedArray([]);

    const average = OtS_ColourAverager.From(data);
    expect(average.r).toBe(NaN);
    expect(average.g).toBe(NaN);
    expect(average.b).toBe(NaN);
    expect(average.a).toBe(NaN);
});

test('Colour averager #7', () => {
    const data = new Uint8ClampedArray([
        0, 0, 0, 0
    ]);

    const average = OtS_ColourAverager.From(data);
    expect(average.r).toBe(NaN);
    expect(average.g).toBe(NaN);
    expect(average.b).toBe(NaN);
    expect(average.a).toBe(0);
});

test('Colour averager #8', () => {
    const averager = OtS_ColourAverager.Create();
    averager.add({ r: 0.0, g: 0.0, b: 0.0,  a: 0.0 });
    averager.add({ r: 1.0, g: 0.5, b: 0.25, a: 0.5 });

    const average = averager.compute();
    expect(average).toStrictEqual({ r: 1.0, g: 0.5, b: 0.25, a: 0.25 });
});

test('Colour averager #9', () => {
    const averager = OtS_ColourAverager.Create();
    averager.add({ r: 1.0, g: 0.5, b: 0.25, a: 0.5 });
    averager.add({ r: 1.0, g: 0.5, b: 0.25, a: 0.5 });

    const average = averager.compute();
    expect(average).toStrictEqual({ r: 1.0, g: 0.5, b: 0.25, a: 0.5 });
});

test('Colour averager #10', () => {
    const averager = OtS_ColourAverager.Create();
    averager.add({ r: 1.0, g: 0.5, b: 0.25, a: 0.5 });
    averager.add({ r: 1.0, g: 0.5, b: 0.25, a: 0.25 });

    const average = averager.compute();
    expect(average).toStrictEqual({ r: 1.0, g: 0.5, b: 0.25, a: 0.375 });
});