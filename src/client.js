const { Renderer } = require('./src/renderer.js');
const { Vector3 } = require('./src/vector.js');

const renderer = new Renderer();

renderer.registerTriangle(new Vector3(0, 0, 0), new Vector3(1, 0, 1), new Vector3(2, -3, -1));
renderer.registerTriangle(new Vector3(0, 1, 0), new Vector3(1, 1, 1), new Vector3(2, -2, -1));
renderer.setStroke(new Vector3(1.0, 0.0, 0.0));
renderer.registerBox(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
renderer.registerBox(new Vector3(0, 1, 0), new Vector3(1, 1, 1));

renderer.compileRegister();


function render(time) {
    renderer.begin();
    
    //renderer.setStroke(new Vector3(1.0, 0.0, 0.0));
    //renderer.drawBox(new Vector3(0, 0, 0), new Vector3(1, 1, 1));

    //renderer.setStroke(new Vector3(0.0, 1.0, 0.0));
    //renderer.drawBox(new Vector3(0, 1, 0), new Vector3(1, 1, 1));

    //renderer.drawTriangle(new Vector3(0, 1, 0), new Vector3(1, 1, 1), new Vector3(2, -2, -1));

    renderer.end();

    requestAnimationFrame(render);
}

requestAnimationFrame(render);