const workerInstance = require('./worker');

addEventListener('message', (e) => {
    // Adding an artifician 2s delay for debug purposes
    // TODO: Remove
    setTimeout(() => {
        postMessage(workerInstance.doWork(e.data));
    }, 3000);
    //postMessage(workerInstance.doWork(e.data));
});
