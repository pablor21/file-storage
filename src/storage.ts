import { IDriver } from "./drivers/driver.interface";
import { LocalFileSystem } from "./drivers/local.driver";

export type StorageConfig = {
    default: string,
    disks: {
        name: string,
        driver?: string,
        config?: any,
        root?: string
    }[];
}

type ClassType<T> = new (...args: any[]) => T;

export class Storage {
    public dirvers: Map<string, any> = new Map();
    public disks: Map<string, IDriver> = new Map();
    public defaultDiskName = 'default';

    constructor(config: StorageConfig) {
        this.addDriver('local', LocalFileSystem);

        this.defaultDiskName = config.default;
        config.disks.map(d => {
            this.addDisk({
                name: d.name,
                root: d.root,
                driver: d.driver,
                ...config
            })
        });

    }

    factory(Ctor: ClassType<IDriver>, ...args: any[]) {
        return new Ctor(...args);
    }

    resolveDriver(name: string): any {
        const d = this.dirvers.get(name);
        if (!d) {
            throw new Error(`The driver ${name} is not configured!`);
        }
        return d;
    }

    addDriver(name: string, driver: any) {
        this.dirvers.set('local', driver);
    }

    addDisk(config: any): IDriver | null {
        const d = this.resolveDriver(config.driver || 'local');
        const disk = this.factory(d, config);
        this.addDiskWithDriver(config.name, disk);
        return this.disk(config.name);
    }

    addDiskWithDriver(name: string, driver: IDriver) {
        this.disks.set(name, driver);
    }

    disk(name?: string): IDriver {
        name = name || this.defaultDiskName;
        const d = this.disks.get(name);
        if (!d) {
            throw new Error(`The disk ${name} is not configured!`);
        }
        return d;
    }
}