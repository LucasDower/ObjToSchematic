const workerInstance = require('./worker');

addEventListener('message', (e) => {
    postMessage(workerInstance.doWork(e.data));
});
