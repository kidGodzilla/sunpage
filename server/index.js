const { exec, spawn } = require('child_process');
const si = require('systeminformation');
const port = process.env.PORT || 3002;
const express = require('express');
// const ngrok = require('./ngrok');
const https = require('https');
const path = require('path');
const cors = require('cors');
const os = require('os');
const app = express();
app.use(cors());

function c2f(c) {
  return c * 9/5 + 32
}

app.use(express.static('public'));

app.get('/message', async (req, res) => {
    let { percentage, temperature } = last_battery_status || {};
    let h = new Date().getHours();
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

    let h = new Date().getHours(), m = new Date().getMinutes();
    // if (h < 0) h += 24;
    data.time = { h, m };

    res.json(data);
});

async function connectNgrok() {
    if (!process.env.TOKEN) return;

    try {
        const url = await ngrok.connect({
            authtoken: process.env.TOKEN,
            addr: port,
            onStatusChange: console.log,
            onLogEvent: console.log,
        });

        console.log('NGROK: \n\n', url);

        https.get(`https://sun.servers.do/update_ngrok?url=${ url }`);
    } catch(e) { console.log(e) }
}

app.listen(port, function () { console.log('App listening on port', port) });

connectNgrok();
