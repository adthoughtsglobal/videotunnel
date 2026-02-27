const videoEl = document.getElementById('video')
const roleSpan = document.getElementById('roleSpan')
var fileInput = document.getElementById('videoSource');

let pm
class FileStreamer {
    constructor(peerManager) {
        this.pm = peerManager
        this.video = null
        this.stream = null
    }

    async streamFile(file, remotePeerId) {
        if (!file) throw new Error('No file')

        this.stop()

        const video = document.createElement('video')
        video.src = URL.createObjectURL(file)
        video.muted = true
        video.playsInline = true

        await video.play()

        const stream = video.captureStream()
        this.stream = stream
        this.video = video

        this.pm.callPeer(remotePeerId, stream)

        this.pm.call.on('stream', () => {
            const sender = this.pm.call.peerConnection
                .getSenders()
                .find(s => s.track.kind === 'video')

            if (!sender) return

            const params = sender.getParameters()
            params.encodings = [{ maxBitrate: 2000000 }]
            sender.setParameters(params)
        })

        video.onended = () => this.stop()
    }

    stop() {
        this.pm.closeCall()

        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop())
            this.stream = null
        }

        if (this.video) {
            this.video.pause()
            URL.revokeObjectURL(this.video.src)
            this.video = null
        }
    }
}

class MediaAssembler {
    constructor(videoElement, peerManager) {
        this.video = videoElement

        peerManager.on('stream', stream => {
            this.video.srcObject = stream
            this.video.pause()

            this.video.onloadeddata = () => {
                setTimeout(() => {
                    this.video.play().catch(() => {})
                }, 3000)
            }
        })

        peerManager.on('callclose', () => {
            this.video.srcObject = null
        })
    }
}