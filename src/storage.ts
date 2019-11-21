import { IDriver } from './drivers/driver.interface';
import { LocalFileSystem } from './drivers/local.driver';
import * as path from 'path';

export interface IStorageConfig {
  default: string;
  disks: Array<{
    name: string;
    driver?: string;
    config?: any;
    root?: string;
  }>;
}

type ClassType<T> = new (...args: any[]) => T;

export class StorageManager {
  public dirvers: Map<string, any> = new Map();
  public disks: Map<string, IDriver> = new Map();
  public defaultDiskName = 'default';

  constructor(config: IStorageConfig) {
    this.addDriver('local', LocalFileSystem);

    this.defaultDiskName = config.default;
    config.disks.map(d => {
      this.addDisk({
        ...config,
        driver: d.driver,
        name: d.name,
        root: path.resolve(process.cwd(), d.root || ''),
      });
    });
  }

  public factory(Ctor: ClassType<IDriver>, ...args: any[]) {
    return new Ctor(...args);
  }

  public resolveDriver(name: string): any {
    const d = this.dirvers.get(name);
    if (!d) {
      throw new Error(`The driver ${name} is not configured!`);
    }
    return d;
  }

  public addDriver(name: string, driver: any) {
    this.dirvers.set('local', driver);
  }

  public addDisk(config: any): IDriver | null {
    const d = this.resolveDriver(config.driver || 'local');
    const disk = this.factory(d, config);
    this.addDiskWithDriver(config.name, disk);
    return this.disk(config.name);
  }

  public addDiskWithDriver(name: string, driver: IDriver) {
    this.disks.set(name, driver);
  }

  public disk(name?: string): IDriver {
    name = name || this.defaultDiskName;
    const d = this.disks.get(name);
    if (!d) {
      throw new Error(`The disk ${name} is not configured!`);
    }
    return d;
  }
}
