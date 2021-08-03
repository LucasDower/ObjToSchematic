const fs = require("fs");

const blocksJSONPath = "./resources/blocks.json";

const blocksJSONString = fs.readFileSync(blocksJSONPath);
const blocks = JSON.parse(blocksJSONString);

let output = [];
for (const block in blocks) {
    const data = blocks[block];
    console.log(data);
    let part = {
        name: block,
        colour: data.colour,
        texcoord: data.texcoord
    };
    output.push(part);
}

console.log(output);

fs.writeFile("blocks_new.json", JSON.stringify(output), function(err) {
    if (err) {
        console.log(err);
    }
});