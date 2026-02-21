document.addEventListener("CyrusReady", () => {
    window.CyrusPeerManager.on('connected', peerId => {
        console.log('Handler: connected to', peerId)
    })

    window.CyrusPeerManager.on('data', data => {
        console.log('Handler: got data', data)
    })

    // to send content
    // window.CyrusPeerManager.send()
});