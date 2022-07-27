var stdin = process.openStdin();

stdin.on('data', function(chunk) {
    //chunk

    if (chunk && chunk.includes('ngrok.io')) {
        var stdouts = chunk.split(' ');
        var url = (stdouts.filter(x => x.includes('ngrok.io'))[0]).trim();

        console.log('NGROK: \n\n', url);

        https.get(`https://sun.servers.do/update_ngrok?url=${ url }`);
    }
});

