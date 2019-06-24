import * as path from 'path';
import { app, ipcMain, BrowserWindow, dialog } from 'electron';

import { ParsedFile, IContextMenuOptions } from '../common/types';
import * as ipcMessages from '../common/ipcMessages';
import * as fileManager from './fileManager';
import * as windowManager from './windowManager';
import { showContextMenu } from './contextMenu';
import * as settings from './settings';


const onSave = async (e: any, data: any) => {
  const window = BrowserWindow.fromWebContents(e.sender);
  const closeWindow = data.data.close;
  const folder = data.payload;

  if (!(folder as ParsedFile[])[0]) {
    windowManager.sendSaveComplete(window, []);
    return;
  }


  const result = await fileManager.saveFolder(folder);

  // get common parent folder
  const filePaths = path.dirname((folder as ParsedFile[])[0].filePath).split(path.sep);
  let folderPath = '';
  let subPath = '';
  let isDifferent = false;

  for (let i = 0; i < filePaths.length; i++) {
    subPath += `${filePaths[i]}${path.sep}`;
    folder.forEach((element: ParsedFile) => {
      if (path.dirname(element.filePath).indexOf(subPath) !== 0) {
        isDifferent = true;
      }
    });

    if (isDifferent) {
      folderPath = filePaths.slice(0, i).join(path.sep);
      break;
    }
  }

  if (!isDifferent) {
    folderPath = filePaths.join(path.sep);
  }

  await fileManager.openFolderInWindow(folderPath, window);

  window.setDocumentEdited(false);
  windowManager.sendSaveComplete(window, result);

  if (result.length > 0) {
    dialog.showErrorBox('Failed to save the following files', result.join('\n'));
    return;
  }

  if (closeWindow) {
    window.close();
  }
};

const onOpen = (e: any, data: string) => {
  const window = BrowserWindow.fromWebContents(e.sender);
  fileManager.openFolderInWindow(data, window);
};

const onDataChanged = (e: any, data: boolean) => {
  const window = BrowserWindow.fromWebContents(e.sender);
  window.setDocumentEdited(data);
};

const onShowContextMenu = (e: any, data: IContextMenuOptions) => {
  const window = BrowserWindow.fromWebContents(e.sender);
  showContextMenu(window, data);
};

const onGetSettings = (e: any) => {
  const window = BrowserWindow.fromWebContents(e.sender);
  windowManager.sendSettings(window, settings.getCustomSettings());
};

const onSaveSettings = (e: any, data: any) => {
  settings.saveCustomSettings(data);
};

const onOpenFile = (e: any, data: any) => {
  if (app.isReady()) {
    fileManager.openFolder(data);
  } else {
    app.on('ready', () => fileManager.openFolder(data));
  }
};

const onRecentFolders = (e: any) => {
  const window = BrowserWindow.fromWebContents(e.sender);
  windowManager.sendRecentFolders(window, settings.getRecentFolders());
};


const registerAppEvents = () => {
  ipcMain.on(ipcMessages.open as any, onOpen);
  ipcMain.on(ipcMessages.save as any, onSave);
  ipcMain.on(ipcMessages.dataChanged as any, onDataChanged);
  ipcMain.on(ipcMessages.showContextMenu as any, onShowContextMenu);
  ipcMain.on(ipcMessages.saveSettings as any, onSaveSettings);
  ipcMain.on(ipcMessages.settings as any, onGetSettings);
  ipcMain.on(ipcMessages.recentFolders as any, onRecentFolders);

  app.on('open-file', onOpenFile);
  app.on('will-finish-launching', () => {
    app.on('open-file', onOpenFile);
  });
};

export default registerAppEvents;
