import * as fs from 'fs-extra';
import * as path from 'path';
import * as glob from 'glob';
import * as mime from 'mime-types';
import { IDriver, IListConfig } from './driver.interface';
import { IFileInfo } from '../fileinfo.interface';
import { Readable } from 'stream';

export interface ILocalFileSystemConfig {
  root: string;
  name: string;
}

export class LocalFileSystem implements IDriver {
  public name: string = '';
  public config: ILocalFileSystemConfig;

  constructor(config: ILocalFileSystemConfig) {
    this.config = config;
    this.name = this.config.name;
  }

  public async test(): Promise<boolean> {
    return await fs.pathExists(this.config.root);
  }

  public async makeDirectory(dir: string, options: { mode: '0777' }): Promise<boolean> {
    try {
      await fs.mkdirs(this.resolvePath(dir));
      return true;
    } catch (ex) {
      if (ex.code === 'EEXIST') {
        return true;
      }
      throw ex;
    }
    return true;
  }

  public async deleteDirectory(dir: string): Promise<boolean> {
    if (dir === '/') {
      throw new Error('Cannot remove the root dir!');
    }
    await fs.remove(this.resolvePath(dir));
    return true;
  }

  public async emptyDirectory(dir: string): Promise<boolean> {
    await fs.emptyDir(this.resolvePath(dir));
    return true;
  }

  public async moveDirectory(src: string, dest: string): Promise<boolean> {
    await fs.move(this.resolvePath(src), this.resolvePath(dest), {
      overwrite: true,
    });
    return true;
  }

  public async copyDirectory(src: string, dest: string): Promise<boolean> {
    await fs.copy(this.resolvePath(src), this.resolvePath(dest), {
      overwrite: true,
    });
    return true;
  }

  public async directoryExists(dir: string): Promise<boolean> {
    return (await this.exists(dir)) === 'DIRECTORY';
  }

  public async listDirectories(dir: string, pattern: string = '/*/'): Promise<IFileInfo[]> {
    return await this.list(dir + pattern, { type: 'DIRECTORY' });
  }

  public async fileExists(dir: string): Promise<boolean> {
    return (await this.exists(dir)) === 'FILE';
  }

  public async exists(filenameOrDir: string): Promise<string | boolean> {
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

  public async getIFileInfo(dir: string): Promise<IFileInfo> {
    dir = this.resolvePath(dir);
    const stats = await fs.stat(dir);
    const mimeType = mime.lookup(dir);
    const fileType = mime.contentType(dir);
    const fInfo: IFileInfo = {
      basename: path.basename(dir),
      createdAt: stats.ctime,
      exists: true,
      extension: path.extname(dir),
      filename: dir,
      filetype: fileType || undefined,
      mime: mimeType || undefined,
      modifiedAt: stats.mtime,
      path: path.dirname(dir),
      size: stats.size,
      type: stats.isDirectory() ? 'DIRECTORY' : 'FILE',
    };
    return fInfo;
  }

  public async list(dir: string, config: IListConfig = { type: 'BOTH' }): Promise<IFileInfo[]> {
    const p = await new Promise<IFileInfo[]>(async (resolve, reject) => {
      await glob(this.resolvePath(dir), async (err, matches) => {
        if (err) {
          reject(err);
        } else {
          const ret: IFileInfo[] = [];
          await Promise.all(
            matches.map(async m => {
              let valid = true;
              const fInfo = await this.getIFileInfo(m);
              switch (config.type) {
                case 'FILE':
                  valid = fInfo.type === 'FILE';
                  break;
                case 'DIRECTORY':
                  valid = fInfo.type === 'DIRECTORY';
                  break;
                default:
                  valid = true;
              }
              if (valid) {
                ret.push(fInfo);
              }
            }),
          );
          resolve(ret);
        }
      });
    });
    return p;
  }

  public async listFiles(dir: string, pattern: string = '/*'): Promise<IFileInfo[]> {
    return await this.list(dir + pattern, { type: 'FILE' });
  }

  public async putFile(filename: string, contents: string | Buffer | Readable): Promise<boolean> {
    const completeFilename = this.resolvePath(filename);
    const dir = path.dirname(completeFilename);
    await fs.ensureDir(dir);
    if (contents instanceof Readable) {
      return new Promise<boolean>((resolve, reject) => {
        const stream = contents.pipe(fs.createWriteStream(completeFilename));
        stream.on('error', err => {
          reject(err);
        });
        stream.on('finish', () => {
          resolve(true);
        });
      });
    } else if (contents instanceof Buffer) {
      await fs.outputFile(completeFilename, contents.toString());
      return true;
    } else {
      await fs.outputFile(completeFilename, contents);
      return true;
    }
  }

  public async getFile(filename: string): Promise<Buffer> {
    return fs.readFile(this.resolvePath(filename));
  }

  public async getFileStream(filename: string): Promise<Readable> {
    return fs.createReadStream(this.resolvePath(filename));
  }

  public async copyFile(src: string, dest: string): Promise<boolean> {
    if (this.fileExists(src)) {
      const completeFilename = this.resolvePath(dest);
      const dir = path.dirname(completeFilename);
      await fs.ensureDir(dir);
      await fs.copyFile(this.resolvePath(src), completeFilename);
    }

    return true;
  }

  public async deleteFile(filename: string): Promise<boolean> {
    try {
      await fs.unlink(this.resolvePath(filename));
      return true;
    } catch (ex) {
      return false;
    }

  }

  public async deleteFiles(src: string, pattern: string = ''): Promise<string[]> {
    const files = await this.list(src + pattern, { type: 'FILE' });
    return Promise.all(
      files.map(async f => {
        await this.deleteFile(f.filename);
        return f.filename;
      }),
    );
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
}
