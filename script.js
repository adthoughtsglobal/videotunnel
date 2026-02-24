const videoEl = document.getElementById('video')
const fileInput = document.getElementById('videoSource')
const roleSpan = document.getElementById('roleSpan')

let pm

document.addEventListener('CyrusReady', () => {
    pm = window.CyrusPeerManager

    pm.on('stream', stream => {
        roleSpan.textContent = 'Receiver'
        videoEl.srcObject = stream
    })
})

fileInput.addEventListener('change', async e => {
    const file = e.target.files[0]
    if (!file || !pm?.conn?.open) return

    roleSpan.textContent = 'Sender'

    const tempVideo = document.createElement('video')
    tempVideo.src = URL.createObjectURL(file)
    tempVideo.muted = true
    tempVideo.playsInline = true

    await tempVideo.play()

    const stream = tempVideo.captureStream()

    pm.call(stream)
})