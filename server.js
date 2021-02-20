const { createServer } = require('http');
const { parse } = require('url');
const WebSocketServer = require('ws').Server;
const child_process = require('child_process');
const url = require('url');

const port = parseInt(process.env.PORT, 10) || 4000;
const dev = process.env.NODE_ENV !== 'production';


const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname, query } = parsedUrl;
        res.write('Web Socket service!');
        res.end(); //end the response
    }).listen(port, err => {
        if (err) throw err;
        console.log(`> Ready on port ${port}`);
    });

const wss = new WebSocketServer({
    server: server
});

wss.on('connection', (ws, req) => {

    console.log('Streaming socket connected');
    ws.send('WELL HELLO THERE FRIEND');

    const queryString = url.parse(req.url).search;
    const params = new URLSearchParams(queryString);
    const token = params.get('token');

    const rtmpUrl = 'rtmp://3.139.79.119/app/'+token;
    const rtspUrl = 'rtsp://localhost:8554/'+token;

    const ffmpeg = child_process.spawn('ffmpeg', [
    '-i','-',

    // video codec config: low latency, adaptive bitrate
    //'-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',
    '-c','copy',
    '-f','rtsp',


    //force to overwrite
    //'-y',


    //'-filter_complex', 'aresample=44100', // resample audio to 44100Hz, needed if input is not 44100
    //'-strict', 'experimental',
    //'-f', 'flv',

    rtspUrl
    ]);

    // Kill the WebSocket connection if ffmpeg dies.
    ffmpeg.on('close', (code, signal) => {
        console.log('FFmpeg child process closed, code ' + code + ', signal ' + signal);
        ws.terminate();
    });

    // Handle STDIN pipe errors by logging to the console.
    // These errors most commonly occur when FFmpeg closes and there is still
    // data to write.f If left unhandled, the server will crash.
    ffmpeg.stdin.on('error', (e) => {
        console.log('FFmpeg STDIN Error', e);
    });

    // FFmpeg outputs all of its messages to STDERR. Let's log them to the console.
    ffmpeg.stderr.on('data', (data) => {
        ws.send('ffmpeg got some data');
        console.log('FFmpeg STDERR:', data.toString());
    });

    ws.on('message', msg => {
        if (Buffer.isBuffer(msg)) {
            console.log('this is some video data');
            ffmpeg.stdin.write(msg);
        } else {
            console.log(msg);
        }
    });

    ws.on('close', e => {
        console.log('shit got closed, yo');
        ffmpeg.kill('SIGINT');
    });
});

