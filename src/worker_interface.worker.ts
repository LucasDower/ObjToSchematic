const workerInstance = require('./worker');

addEventListener('message', async (e) => {
    const result = await workerInstance.doWork(e.data);
    postMessage(result);
});
