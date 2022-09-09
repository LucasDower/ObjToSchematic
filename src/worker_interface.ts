const workerInstance = require('./worker');

addEventListener('message', (e) => {
    setTimeout(() => {
        postMessage(workerInstance.doWork(e.data));
    }, 3000);
});
