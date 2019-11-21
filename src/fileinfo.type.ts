export type FileInfo = {
    filename: string,
    path: string,
    mime?: string,
    filetype?: string;
    type?: "FILE" | "DIRECTORY",
    size?: number,
    basename: string,
    extension: string,
    createdAt?: Date,
    modifiedAt?: Date,
    exists: boolean,
}