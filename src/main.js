import { app, Tray, Menu, nativeImage } from 'electron';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

let tray;

function parseSinkInfo(output) {
  const sinks = [];
  const blocks = output.split('\n\n');

  blocks.forEach(block => {
    const nameMatch = block.match(/Nome: (.+)/);
    const descriptionMatch = block.match(/Descrição: (.+)/);

    if(nameMatch && descriptionMatch) {
      sinks.push({
        name: nameMatch[1],
        description: descriptionMatch[1],
      })
    }
  });

  return sinks;
}

function listAudioDevices() {
  return new Promise((resolve, reject) => {
    exec('pactl list sinks', (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
  
      const devices = parseSinkInfo(stdout);
      const jsonOutput = JSON.stringify(devices, null, 2);
  
      resolve(jsonOutput);
    })
  })
}

function selectDefaultAudioDevice(device) {
  return new Promise((resolve, reject) => {
    exec(`pactl set-default-sink ${device}`, (err) => {
      if(err) {
        return reject(err);
      }

      return resolve;
    })
  })
}

app.whenReady().then(async () => {
  const image = path.join(__dirname, 'public', 'images', 'icon.png')
  const icon = nativeImage.createFromPath(image);
  tray = new Tray(icon);

  tray.setTitle('Tux Headphones');

  try {
    const devices = await listAudioDevices();

    const parseDevices = JSON.parse(devices);
    const menuItems = parseDevices.map(device => ({
      label: device.description,
      type: 'radio',
      checked: false,
      click: async () => {
        await selectDefaultAudioDevice(device.name)
      }
    }))

    console.log(devices);
    const contextMenu = Menu.buildFromTemplate(menuItems);

    tray.setContextMenu(contextMenu);
  } catch (err) {
    console.error(err);
  }
  
});
