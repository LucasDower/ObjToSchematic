const workerInstance = require('./worker');

addEventListener('message', (e) => {
    const result = workerInstance.doWork(e.data);
    if (result !== undefined) {
        postMessage(workerInstance.doWork(e.data));
    }
});
