const { v3: Vector3 } = require("twgl.js");
const twgl = require('twgl.js');
const fs = require('fs');

function getGridColour(i, j, isXAxis) {
    if (i == 0 && isXAxis) {
        return [0.25, 0.75, 0.25];
    }
    if (j == 0 && !isXAxis) {
        return [0.75, 0.25, 0.25];
    }
    return [0.25, 0.25, 0.25];
}

function generateGridMesh() {
    vertices = [];
    colours = [];
    indices = [];

    var gridSize = 64;

    for (let i = -gridSize / 2; i < gridSize / 2; i++) {
        for (let j = -gridSize / 2; j < gridSize / 2; j++) {
            let k = indices.length;

            let colour = getGridColour(i, j, false);
            vertices.push(i, 0, j);
            colours.push(colour[0], colour[1], colour[2]); // .push > .concat
            indices.push(k);

            vertices.push(i + 1, 0, j);
            colours.push(colour[0], colour[1], colour[2]);
            indices.push(k + 1);


            colour = getGridColour(i, j, true);
            vertices.push(i, 0, j);
            colours.push(colour[0], colour[1], colour[2]);
            indices.push(k + 2);

            vertices.push(i, 0, j + 1);
            colours.push(colour[0], colour[1], colour[2]);
            indices.push(k + 3);
        }
    }

    let k = indices.length;

    vertices.push(gridSize / 2, 0, -gridSize / 2);
    colours.push(0.0, 1.0, 1.0);
    indices.push(k);

    vertices.push(gridSize / 2, 0, gridSize / 2);
    colours.push(0.0, 1.0, 1.0);
    indices.push(k + 1);

    vertices.push(-gridSize / 2, 0, gridSize / 2);
    colours.push(1.0, 0.0, 0.0);
    indices.push(k + 2);

    vertices.push(gridSize / 2, 0, gridSize / 2);
    colours.push(1.0, 0.0, 0.0);
    indices.push(k + 3);

    return { position: { numComponents: 3, data: vertices }, colour: { numComponents: 3, data: colours }, indices: indices };
}

module.exports.generateGridMesh = generateGridMesh;