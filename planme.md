file streamer:
Turn a local file or live stream into chunks
read local video file and stream the data with CyrusPeerManager.send() interface.


Media assembler:
Reassemble ArrayBuffer chunks in order.
Collect incoming chunks from the network and rebuild them into playable content.
Feed them to MediaSource Extensions (MSE) for video playback or WebCodecs for decoding.


Encoder / Decoder:
To later add different modes of encoding.
use
*Transparent*: minimal sender CPU, very stable, File format must already be reciever browser compatible.
by default.


ControlManager:
Start/stop streams, Pause, resume, seek, Handle reconnections. Basically a state system.
