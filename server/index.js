const { exec } = require('child_process');
const si = require('systeminformation');
const port = process.env.PORT || 3002;
const express = require('express');
// const ngrok = require('ngrok');
const https = require('https');
const path = require('path');
const cors = require('cors');
const app = express();
app.use(cors());

function c2f(c) {
  return c * 9/5 + 32
}

app.use(express.static('public'));

app.get('/message', async (req, res) => {
    let { percentage, temperature } = last_battery_status || {};
    let h = new Date().getHours() - 7;
    if (h < 0) h += 24;
    const sunny = h >= 6 && h <= 21;

    let message = `Hello! It's ${ new Date().toLocaleTimeString() }. The ${ sunny ? 'sun is shining':'sun has set' } and I'm online!`;

    if (percentage) message += ` Battery percent: ${ percentage }%.`;
    if (temperature) message += ` Current temperature: ${ (c2f(temperature)).toFixed(1) }˚f.`;

    res.send(message);
});

let system_data = null, last_battery_status = null, last_battery_check = 0;

let { percentage, temperature } = last_battery_status || {};

async function getBatteryStatus() {
    return new Promise((resolve, reject) => {
        let one_minute_ago = (+ new Date()) - 1 * 60 * 1000;
        if (last_battery_check > one_minute_ago) return resolve(last_battery_status);

        exec(`termux-battery-status`, function(error, stdout, stderr) { 
            try { stdout = JSON.parse(stdout) } catch(e){}
            last_battery_check = + new Date();
            last_battery_status = stdout;
            resolve(stdout);
        });
    });
}

app.get('/status', async (req, res) => {
    let data;
    
    if (system_data) {
        data = system_data;
    } else {
        data = system_data = await si.get({
         cpu: '*',
         memory: '*',
         os: '*',
         fsSize: '*',
         osInfo: 'platform, release',
         system: 'model, manufacturer',
         battery: '*',
         network: '*',
        });
    }

    if (!data.battery || !data.battery.hasBattery) {
        data.battery = await getBatteryStatus();
    }

    res.json(data);
});

async function connectNgrok() {
    if (process.env.TOKEN) await ngrok.authtoken(process.env.TOKEN);
    const url = await ngrok.connect(port);

    console.log('NGROK: \n\n', url);

    https.get(`https://sun.servers.do/update_ngrok?url=${ url }`);
}

app.listen(port, function () { console.log('App listening on port', port) });

// connectNgrok();
