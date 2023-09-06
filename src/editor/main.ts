import { AppContext } from './app_context';

AppContext.init();

// Begin draw loop
function render() {
    AppContext.draw();
    requestAnimationFrame(render);
}
requestAnimationFrame(render);
