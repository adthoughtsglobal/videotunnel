const videoEl = document.getElementById('video')
const roleSpan = document.getElementById('roleSpan')
var fileInput = document.getElementById('videoSource');

let pm

class FileStreamer {
    constructor(peerManager, options = {}) {
        this.peerManager = peerManager
        this.recorder = null
        this.video = null
        this.streaming = false
        this.timeslice = options.timeslice || 2000
        this.bitrate = options.bitrate || 2_500_000
    }

    async streamFile(file) {
        if (!file) throw new Error('No file provided')

        this.streaming = true

        const video = document.createElement('video')
        video.src = URL.createObjectURL(file)
        video.muted = true
        await video.play()
        this.video = video

        const stream = video.captureStream()

        this.recorder = new MediaRecorder(stream, {
            mimeType: 'video/webm; codecs=vp8,opus',
            videoBitsPerSecond: this.bitrate
        })

        this.peerManager.send(JSON.stringify({
            type: 'file-meta',
            mime: 'video/webm; codecs="vp8,opus"'
        }))

        this.recorder.ondataavailable = async e => {
            if (e.data.size > 0 && this.streaming) {
                const buf = await e.data.arrayBuffer()
                this.peerManager.send(buf)
            }
        }

        this.recorder.onstop = () => {
            this.peerManager.send(JSON.stringify({ type: 'file-end' }))
            this.cleanup()
        }

        this.recorder.start(this.timeslice)

        video.onended = () => {
            if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop()
        }
    }

    stop() {
        this.streaming = false
        if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop()
        this.cleanup()
    }

    cleanup() {
        if (this.video) {
            this.video.pause()
            URL.revokeObjectURL(this.video.src)
        }
        this.video = null
        this.recorder = null
    }
}

class MediaAssembler {
    constructor(videoElement) {
        this.video = videoElement
        this.mediaSource = null
        this.sourceBuffer = null
        this.queue = []
        this.ready = false
        this.ended = false

        this.minBufferToStart = 4   // start when 4s buffered
        this.maxBufferLength = 20   // trim if > 20s
        this.playing = false
    }

    handleData(data) {
        if (typeof data === 'string') {
            const msg = JSON.parse(data)
            if (msg.type === 'file-meta') this.init(msg.mime)
            if (msg.type === 'file-end') {
                this.ended = true
                this.tryEnd()
            }
            return
        }

        this.queue.push(data)
        this.flush()
    }

    init(mime) {
        this.cleanup()

        this.mediaSource = new MediaSource()
        this.video.src = URL.createObjectURL(this.mediaSource)

        this.mediaSource.addEventListener('sourceopen', () => {
            if (!MediaSource.isTypeSupported(mime)) return

            this.sourceBuffer = this.mediaSource.addSourceBuffer(mime)
            this.sourceBuffer.mode = 'segments'

            this.sourceBuffer.addEventListener('updateend', () => {
                this.trimBuffer()
                this.flush()
                this.checkStartPlayback()
                this.tryEnd()
            })

            this.ready = true
            this.flush()
        })
    }

    flush() {
        if (!this.ready) return
        if (!this.sourceBuffer) return
        if (this.sourceBuffer.updating) return
        if (this.queue.length === 0) return
        if (this.mediaSource.readyState !== 'open') return

        try {
            const chunk = this.queue.shift()
            this.sourceBuffer.appendBuffer(chunk)
        } catch {}
    }

    checkStartPlayback() {
        if (this.playing) return
        if (!this.video.buffered.length) return

        const buffered = this.video.buffered.end(0) - this.video.currentTime
        if (buffered >= this.minBufferToStart) {
            this.video.play()
            this.playing = true
        }
    }

    trimBuffer() {
        if (!this.video.buffered.length) return
        const current = this.video.currentTime
        const bufferedEnd = this.video.buffered.end(0)
        if (bufferedEnd - current > this.maxBufferLength) {
            const removeEnd = current - 5
            if (removeEnd > 0 && !this.sourceBuffer.updating) {
                try { this.sourceBuffer.remove(0, removeEnd) } catch {}
            }
        }
    }

    tryEnd() {
        if (!this.ended) return
        if (!this.ready) return
        if (this.sourceBuffer?.updating) return
        if (this.queue.length !== 0) return
        if (this.mediaSource.readyState !== 'open') return

        try { this.mediaSource.endOfStream() } catch {}
    }

    cleanup() {
        this.ready = false
        this.queue = []
        this.playing = false
        if (this.sourceBuffer) {
            try { this.sourceBuffer.abort() } catch {}
        }
        this.sourceBuffer = null
        this.mediaSource = null
    }
}