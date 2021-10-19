import { ESLint } from 'eslint';

import workerTask, { WorkerMessage } from '@engine/worker-task';
import { parentPort } from '__mocks__/worker_threads';

jest.mock('worker_threads', () => require('./__mocks__/worker_threads'));

function getPostMessageCalls<Type extends WorkerMessage['type']>(
    type?: Type
): (WorkerMessage & { type: Type })[] {
    const calls = parentPort.postMessage.mock.calls.map(call => {
        const [message] = call;
        return message;
    });

    return calls.filter(call => {
        if (type) return call.type === type;
        return call;
    });
}

beforeEach(() => {
    parentPort.postMessage.mockClear();
});

test('should limit length of results to 1000 characters', async () => {
    await workerTask();

    const resultMessages = getPostMessageCalls('ON_RESULT');
    expect(resultMessages).toHaveLength(1);

    const { messages } = resultMessages[0].payload;
    expect(messages).toHaveLength(1);

    const [message] = messages;
    const { source } = message;

    // Original source should be 2000 lines
    const [original] = await new ESLint().lintFiles('');
    expect(original.source).toHaveLength(2000);

    // Final result should be limited to 1000 characters, + anything generated by @babel/code-frame
    expect(source!.length).toBeLessThanOrEqual(1050);

    // Last three characters should be '...'
    expect(source!.slice(-3)).toBe('...');
});
