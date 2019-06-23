import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { createWindow, getAvailableWindow, sendOpen, sendRecentFolders, } from './windowManager';
import { getParsedFiles, saveFile } from './pluginManager';
import * as settings from './settings';
import { ParsedFile } from '../common/types';


export const openFolder = async (folderPath: string) => {
  const window = getAvailableWindow() || createWindow();
  await openFolderInWindow(folderPath, window);
};

export const openFolderInWindow = async (folderPath: string, window: Electron.BrowserWindow) => {
  app.addRecentDocument(folderPath);
  const recent = settings.addRecentFolder(folderPath);

  const parsedFiles = await parseFolder(folderPath);

  sendOpen(window, folderPath, parsedFiles);
  sendRecentFolders(window, recent);
};

export const parseFolder = async (folderPath: string): Promise<ParsedFile[]> => {
  const files = await getFiles(folderPath);
  return await getParsedFiles(files);
};

export const getFiles = async (folderPath: string): Promise<string[]> => {
  const files = await util.promisify(fs.readdir)(folderPath);
  const result = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.startsWith('.')) {
      const filePath = path.join(folderPath, file)
      if (fs.lstatSync(filePath).isDirectory()) {
        const deepFiles = await getFiles(filePath);
        result.push(...deepFiles);
      }
      else {
        result.push(path.join(folderPath, file));
      }
    }
  }

  return result
    .filter(f => fs.lstatSync(f).isFile());
};

export const saveFolder = async (data: ParsedFile[]) => {
  const saveAll = data.map(item => saveFile(item));
  const result = await Promise.all(saveAll);

  return result
    .map((success: boolean, index: number) => ({ success, file: data[index].fileName }))
    .filter((i: any) => !i.success)
    .map((i: any) => i.file);
};
