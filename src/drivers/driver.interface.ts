import { FileInfo } from "../fileinfo.type";
import { Readable } from "stream";

export type ListConfig = {
    type: "DIRECTORY" | "FILE" | "BOTH",
    recursive?: boolean;
};

export interface IDriver {
    name: string;
    config: any;
    test(): Promise<boolean>;
    makeDirectory(dir: string, options?: { mode: "0777" }): Promise<boolean>;
    deleteDirectory(dir: string): Promise<boolean>;
    emptyDirectory(dir: string): Promise<boolean>;
    moveDirectory(src: string, dest: string): Promise<boolean>;
    copyDirectory(src: string, dest: string): Promise<boolean>;
    directoryExists(dir: string): Promise<boolean>;
    listDirectories(dir: string, pattern?: string): Promise<FileInfo[]>;
    fileExists(dir: string): Promise<boolean>;
    exists(filenameOrDir: string): Promise<string | boolean>;
    list(dir: string, config?: ListConfig): Promise<FileInfo[]>;
    listFiles(dir: string, pattern?: string): Promise<FileInfo[]>
    putFile(filename: string, contents: string | Buffer | Readable): Promise<boolean>;
    getFile(filename: string): Promise<Buffer>;
    getFileStream(filename: string): Promise<Readable>;
    copyFile(src: string, dest: string): Promise<boolean>;
    deleteFile(filename: string): Promise<boolean>;
    deleteFiles(src: string, pattern?: string): Promise<string[]>;
    getFileInfo(dir: string): Promise<FileInfo>;
}