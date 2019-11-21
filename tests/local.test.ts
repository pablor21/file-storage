import { StorageManager, LocalFileSystem } from '../src';
import * as path from 'path';

const storage = new StorageManager({
    default: 'default',
    disks: {
        'default': {
            driver: 'local',
            root: 'test_dir'
        }
    }
});

const disk = storage.disk();
const dir = '/1/2/3';
test('Local Driver Instance', () => {
    expect(disk).toBeInstanceOf(LocalFileSystem);
});

test('Make dir', async () => {
    await disk.makeDirectory(dir);
    expect((await disk.directoryExists(dir))).toBe(true);
})

test('Make file from string', async () => {
    await disk.putFile(dir + '/test.txt', 'test');
    expect((await disk.getFile(dir + '/test.txt')).toString()).toBe('test');
})

test('Make file from stream', async () => {
    await disk.putFile(dir + '/test-stream.txt', (await disk.getFileStream(dir + '/test.txt')));
    expect((await disk.getFile(dir + '/test-stream.txt')).toString()).toBe('test');
})

test('Copy file', async () => {
    await disk.copyFile(dir + '/test.txt', dir + '/test-copy.txt');
    expect((await disk.getFile(dir + '/test-copy.txt')).toString()).toBe('test');
});


test('List files', async () => {
    expect(await disk.listFiles(dir)).toHaveLength(3);
});

test('List directories', async () => {
    expect(await disk.listDirectories('/1')).toHaveLength(1);
});

test('List directories recursive', async () => {
    expect(await disk.listDirectories('/1', '/**/*/')).toHaveLength(2);
});

test('List all', async () => {
    expect(await disk.list('/1/2/*/**', { type: "BOTH" })).toHaveLength(4);
});

test('Remove file', async () => {
    await disk.deleteFile(dir + '/test.txt');
    expect(await disk.listFiles(dir)).toHaveLength(2);
});

test('Remove multiple files', async () => {
    await disk.deleteFiles(dir, '/*.txt');
    expect(await disk.listFiles(dir)).toHaveLength(0);
});


test('Remove dir', async () => {
    await disk.deleteDirectory(dir);
    expect((await disk.directoryExists(dir))).toBe(false);
})

test('Empty dir', async () => {
    await disk.emptyDirectory('/');
    expect((await disk.listDirectories('/'))).toHaveLength(0);
})

test('Remove root', async () => {
    try {
        await disk.deleteDirectory('/')
    } catch (ex) {

    }
    expect((await disk.directoryExists('/'))).toBe(true);
})