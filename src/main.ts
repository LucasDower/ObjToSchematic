
/**
                ,d                            
                88                            
    ,adPPYba, MM88MMM ,adPPYba,  8b,dPPYba,   
    I8[    ""   88   a8"     "8a 88P'    "8a  
     `"Y8ba,    88   8b       d8 88       d8  
    aa    ]8I   88,  "8a,   ,a8" 88b,   ,a8"  
    `"YbbdP"'   "Y888 `"YbbdP"'  88`YbbdP"'   
                                 88           
                                 88

    If you're interested in the code, I recommend starting in /src/AppContext.ts
    The stuff here is boring Electron boilerplate \(•◡•)/
*/

import { app, BrowserWindow } from 'electron';
import path from 'path';
import url from 'url';
import { AppConfig } from './config';
import { BASE_DIR, STATIC_DIR } from './util';

app.commandLine.appendSwitch('js-flags', `--max-old-space-size=${AppConfig.OLD_SPACE_SIZE}`);

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: BrowserWindow;

function createWindow() {
    // Create the browser window.
    // const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize;
    const width = 1400;
    const height = 800;

    // const appIcon = new Tray("../resources/icon.png");
    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        icon: path.join(STATIC_DIR, process.platform === 'win32' ? './icon.ico' : './icon.png'),
        minWidth: 1280,
        minHeight: 720,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        },
    });
    if (!AppConfig.DEBUG_ENABLED) {
        mainWindow.removeMenu();
    }
    
    // Load index.html
    mainWindow.loadURL(url.format({
        pathname: path.join(BASE_DIR, './index.html'),
        protocol: 'file:',
        slashes: true,
    }));

    const baseTitle = 'ObjToSchematic – Convert 3D models into Minecraft builds';
    try {
        const branchName = require('child_process').execSync('git rev-parse --abbrev-ref HEAD');
        const commitHash = require('child_process').execSync('git rev-parse --short HEAD');
        mainWindow.setTitle(`${baseTitle} (git//${branchName}++${commitHash})`);
    } catch (e: any) {
        mainWindow.setTitle(`${baseTitle} (release//v0.5.0)`);
    }
    
    // Open the DevTools.
    // mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        app.quit();
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function() {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});
