import { IDriver, ListConfig } from "./driver.interface";
import * as fs from 'fs-extra';
import * as path from 'path';
import * as glob from 'glob';
import * as mime from 'mime-types';
import { Readable } from "stream";
import { FileInfo } from "../fileinfo.type";

export type LocalFileSystemConfig = {
    root: string,
    name: string,
}

export class LocalFileSystem implements IDriver {

    name: string = '';
    config: LocalFileSystemConfig;


    constructor(config: LocalFileSystemConfig) {
        this.config = config;
        this.name = this.config.name;
    }

    private resolvePath(source: string): string {
        if (source.startsWith('/')) {
            source = source.substr(1);
        }
        if (!source) {
            return this.config.root;
        }
        return path.resolve(this.config.root, source);
    }

    async test(): Promise<boolean> {
        return await fs.pathExists(this.config.root);
    }

    async makeDirectory(dir: string, options: { mode: "0777" }): Promise<boolean> {
        try {
            await fs.mkdirs(this.resolvePath(dir));
            return true;
        } catch (ex) {
            if (ex.code == 'EEXIST') return true;
            throw ex;
        }
        return true;
    }

    async deleteDirectory(dir: string): Promise<boolean> {
        if (dir === '/') {
            throw new Error('Cannot remove the root dir!');
        }
        await fs.remove(this.resolvePath(dir));
        return true;
    }

    async emptyDirectory(dir: string): Promise<boolean> {
        await fs.emptyDir(this.resolvePath(dir));
        return true;
    }

    async moveDirectory(src: string, dest: string): Promise<boolean> {
        await fs.move(this.resolvePath(src), this.resolvePath(dest), {
            overwrite: true
        });
        return true;
    }

    async copyDirectory(src: string, dest: string): Promise<boolean> {
        await fs.copy(this.resolvePath(src), this.resolvePath(dest), {
            overwrite: true
        });
        return true;
    }

    async directoryExists(dir: string): Promise<boolean> {
        return await this.exists(dir) === 'DIRECTORY';
    }

    async listDirectories(dir: string, pattern: string = '/*/'): Promise<FileInfo[]> {
        return await this.list(dir + pattern, { type: "DIRECTORY" });
    }

    async fileExists(dir: string): Promise<boolean> {
        return await this.exists(dir) === 'FILE';
    }

    async exists(filenameOrDir: string): Promise<string | boolean> {
        try {
            const stats = await fs.stat(this.resolvePath(filenameOrDir));
            if (stats.isFile()) {
                return 'FILE';
            } else if (stats.isDirectory()) {
                return 'DIRECTORY';
            }
            return false;
        } catch (ex) {
            return false;
        }
    }

    async getFileInfo(dir: string): Promise<FileInfo> {
        dir = this.resolvePath(dir);
        const stats = await fs.stat(dir);
        const mimeType = mime.lookup(dir);
        const fileType = mime.contentType(dir);
        const fInfo: FileInfo = {
            filename: dir,
            path: path.dirname(dir),
            basename: path.basename(dir),
            mime: mimeType || undefined,
            filetype: fileType || undefined,
            type: stats.isDirectory() ? 'DIRECTORY' : 'FILE',
            exists: true,
            extension: path.extname(dir),
            createdAt: stats.ctime,
            modifiedAt: stats.mtime,
            size: stats.size,
        }
        return fInfo;
    }

    async list(dir: string, config: ListConfig = { type: "BOTH" }): Promise<FileInfo[]> {
        const p = await new Promise<FileInfo[]>(async (resolve, reject) => {
            await glob(this.resolvePath(dir), async (err, matches) => {
                if (err) {
                    reject(err);
                } else {
                    const ret: FileInfo[] = [];
                    await Promise.all(matches.map(async m => {
                        let valid = true;
                        const fInfo = await this.getFileInfo(m);
                        switch (config.type) {
                            case "FILE":
                                valid = fInfo.type === "FILE";
                                break;
                            case "DIRECTORY":
                                valid = fInfo.type === "DIRECTORY";
                                break;
                            default:
                                valid = true;
                        }
                        if (valid) {

                            ret.push(fInfo);
                        }
                    }));
                    resolve(ret);
                }
            });
        });
        return p;
    }

    async listFiles(dir: string, pattern: string = '/*'): Promise<FileInfo[]> {
        return await this.list(dir + pattern, { type: "FILE" });
    }

    async putFile(filename: string, contents: string | Buffer | Readable): Promise<boolean> {
        if (contents instanceof Readable) {
            return new Promise<boolean>((resolve, reject) => {
                const stream = contents.pipe(fs.createWriteStream(this.resolvePath(filename)));
                stream.on('error', (err) => {
                    reject(err);
                })
                stream.on('finish', () => {
                    resolve(true);
                })
            })
        } else if (contents instanceof Buffer) {
            await fs.outputFile(this.resolvePath(filename), contents.toString());
            return true;
        } else {
            await fs.outputFile(this.resolvePath(filename), contents);
            return true;
        }

    }

    async getFile(filename: string): Promise<Buffer> {
        return fs.readFile(this.resolvePath(filename));
    }

    async getFileStream(filename: string): Promise<Readable> {
        return fs.createReadStream(this.resolvePath(filename));
    }

    async copyFile(src: string, dest: string): Promise<boolean> {
        //return await this.putFile(src, (await this.getFileStream(dest)));
        await fs.copyFile(this.resolvePath(src), this.resolvePath(dest));
        return true;
    }

    async deleteFile(filename: string): Promise<boolean> {
        await fs.unlink(this.resolvePath(filename));
        return true;
    }

    async deleteFiles(src: string, pattern: string = ''): Promise<string[]> {
        const files = await this.list(src + pattern, { type: "FILE" });
        return Promise.all(files.map(async (f) => {
            await this.deleteFile(f.filename);
            return f.filename;
        }));
    }
}