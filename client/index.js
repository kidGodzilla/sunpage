const { createProxyMiddleware } = require('http-proxy-middleware');
const mcache = require('memory-cache');
const port = process.env.PORT || 5001;
const express = require('express');
let ngrok_url = '', server = null;
const app = express();

app.use(function (req, res, next) {
        // Save end and write, they will be overwritten below:
        const _end = res.end;
        const _write = res.write;
        // Create a chunk list to rebuild body at the end:
        let chunks = [];

        // Don't utilize this middleware if url has query or is not a GET:
        if (req.path !== req.originalUrl || req.method.toUpperCase() !== 'GET') return next();
        if (!req.path.indexOf('/system/')) return next();

        // Check to see if response has been cached, if so use it:
        const full_url = (req.protocol + '://' + req.get('host') + (req.originalUrl || req.url));
        const prevResponse = mcache.get(full_url); // Previously req.path

        if (prevResponse) {
            // This path is cached, so send it:
            // console.log('Sending cached response:', (req.protocol + '://' + req.get('host') + (req.originalUrl || req.url)));
            res.set(prevResponse.headers); // Set headers
            res.send(prevResponse.body); // Send body
            return;
        }

        function processChunk(chunk, encoding) {
            // Check if chunk is not null:
            if (chunk) {
                // Coerce chunk into a buffer:
                if (!Buffer.isBuffer(chunk) && encoding !== 'buffer') {
                    chunk = Buffer.from(chunk, encoding);
                }
                // Add chunk to chunk list:
                chunks.push(chunk);
            }
        }

        // Overwrite write to grab chunk:
        res.write = function (chunk, encoding) {
            // Intercept chunk:
            processChunk(chunk, encoding);
            // Send chunk:
            _write.apply(res, arguments);
        };

        // Overwrite end to cache body:
        res.end = function (chunk, encoding) {
            // Get final chunk of body:
            processChunk(chunk, encoding);
            // Send body before caching to make use of async io:
            _end.apply(res, arguments);
            // Cache response if 200:
            if (res.statusCode === 200) {
                const full_url = (req.protocol + '://' + req.get('host') + (req.originalUrl || req.url));
                mcache.put(full_url, { // Previously req.path
                    body: Buffer.concat(chunks), // Merge chunks
                    // Store headers that were set:
                    headers: Object.keys(res._headers).reduce((headers, name) => {
                        // Resolve HeaderName: value
                        headers[res._headerNames[name]] = res._headers[name];
                        return headers;
                    }, {})
                }, 30 * 1000);
            }
        };

        // Go to next middleware:
        next();
});

async function restart() {
	if (server) {
		await server.close();
		start();
	}
	else start();
}

function start() {
    mcache.clear();

	app.get('/update_ngrok', (req, res) => {
		let { url } = req.query;

		// url = url.replace('https://', '');
		// url = url.replace('/', '');
		console.log(url);
		ngrok_url = url;

		restart();
		res.send('ok');
	});

	if (ngrok_url) app.use('/', createProxyMiddleware({ target: ngrok_url, changeOrigin: true }));
	// else if (!ngrok_url) app.use('/', (req, res) => { res.send('Server offline') });
    // app.get('*',  (req, res) => { res.send('Server offline') });

	server = app.listen(port, () => console.log('App listening on port', port));
}

restart();
