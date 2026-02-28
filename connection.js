
var fileInput = document.getElementById('videoSource')

const loadAssets = async () => {
    const loadCSS = (href) => new Promise(resolve => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve();
        document.head.appendChild(link);
    });

    const loadJS = (src) => new Promise(resolve => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        document.body.appendChild(script);
    });

    await loadCSS('cyrus.css');
    await loadJS('reqs.js');
};

loadAssets().then(() => {
    window.CyrusPeerManager = new CyrusPeerManager();

    window.CyrusPeerManager.on('open', id => {
        window.CYRUS_PEER_ID = id
    })


    document.dispatchEvent(new Event("CyrusReady"));
    dialog.show()
});
class CyrusPeerManager {
    constructor() {
        this.peer = new Peer()
        this.conn = null
        this.call = null
        this.handlers = {}

        this.peer.on('open', id => {
            this.trigger('open', id)
        })

        this.peer.on('connection', conn => {
            console.log("123")
            this.conn = conn


            conn.on('open', () => {
                console.log("12")
                this.trigger('connected', conn.peer)
                document.dispatchEvent(new Event('CyrusConnected'))
                dialog.close()
            })


            conn.on('data', data => this.trigger('data', data))

            conn.on('close', () => {
                this.conn = null
                this.trigger('close')
            })
        })

        this.peer.on('call', call => {
            if (this.call) this.call.close()
            this.call = call

            call.answer()

            call.on('stream', stream => {
                console.log("132")
                this.trigger('stream', stream)
            })

            call.on('close', () => {
                this.call = null
                this.trigger('callclose')
            })
        })
    }

    connectTo(peerId) {
        const conn = this.peer.connect(peerId)
        this.attachConnection(conn)
    }

    callPeer(peerId, stream) {
        if (this.call) this.call.close()

        this.call = this.peer.call(peerId, stream)

        this.call.on('stream', remoteStream => {
            this.trigger('stream', remoteStream)
        })

        this.call.on('close', () => {
            this.call = null
            this.trigger('callclose')
        })
    }

    send(data) {
        if (!this.conn?.open) return
        this.conn.send(data)
    }

    closeCall() {
        if (this.call) {
            this.call.close()
            this.call = null
        }
    }

    on(event, cb) {
        if (!this.handlers[event]) this.handlers[event] = []
        this.handlers[event].push(cb)
    }

    trigger(event, ...args) {
        (this.handlers[event] || []).forEach(cb => cb(...args))
    }

    attachConnection(conn) {
        this.conn = conn

        conn.on('open', () => {
            this.trigger('connected', conn.peer)
            document.dispatchEvent(new Event('CyrusConnected'))
        })

        conn.on('data', data => this.trigger('data', data))

        conn.on('close', () => {
            this.conn = null
            this.trigger('close')
        })
    }
}
class CyrusDialog {
    constructor(rootId) {
        this.root = document.getElementById(rootId)
        this.methodAppContainer = null
        this.activeApp = null
        this.apps = {}
    }

    registerApp(key, appInstance) {
        this.apps[key] = appInstance
    }

    show() {
        this.root.innerHTML = this.template()
        this.methodAppContainer = this.root.querySelector('.methodApp')
        this.root.classList.add('show')
        this.bind()
    }
    close() {
        document.getElementById("weareconnected").style.display = "flex";
        setTimeout(() => this.root.classList.remove('show'), 3000);
        setTimeout(() => {
            this.root.innerHTML = '';
            this.activeApp = null;
        }, 3300);
    }

    bind() {
        this.root.querySelectorAll('.connectionMethod').forEach(el => {
            el.addEventListener('click', () => {
                const key = el.dataset.key
                this.loadApp(key)
            })
        })
    }

    loadApp(key) {
        if (this.activeApp && this.activeApp.destroy) {
            this.activeApp.destroy()
        }

        const app = this.apps[key]
        if (!app) return

        this.methodAppContainer.innerHTML = app.html()
        app.mount(this.methodAppContainer)

        requestAnimationFrame(() => {
            if (app.onLoad) app.onLoad()
        })

        this.activeApp = app
    }

    template() {
        return `
        <div class="cryus_dialog">
            <div class="cyrus_inner">

        <div id="weareconnected" style="display: none;">
        <div class="icn doneicn" >done_all</div>
        <h1>We are connected!</h1>
        <small class="cyrus">Cyrus Wizard closes in 3 seconds...</small>
        </div>
                <div class="header">
                    <h1>First, let's connect these together</h1>
                    <p>Both your devices must be on the same network.</p>
                </div>
                <div class="cyrus_sides">
                    <div class="side">
                        <div class="waysForConnection">
                          <div class="label">Same window (Same browser required)</div>

                            <div class="connectionMethod" data-key="stab-host">
                                <div class="icn">tab_recent</div>
                                <div class="p">Listen for cyrus tabs</div>
                                <div class="continueBtn icn">chevron_forward</div>
                            </div>
                            <div class="connectionMethod" data-key="stab-join">
                                <div class="icn">tab_search</div>
                                <div class="p">Announce this cyrus tab</div>
                                <div class="continueBtn icn">chevron_forward</div>
                            </div>
                        <div class="label">Smart PIN (LAN only)</div>

                            <div class="connectionMethod" data-key="spin-generate">
                                <div class="icn">wand_stars</div>
                                <div class="p">Generate a smart PIN</div>
                                <div class="continueBtn icn">chevron_forward</div>
                            </div>
                            <div class="connectionMethod" data-key="spin-connect">
                                <div class="icn">password</div>
                                <div class="p">Connect with a smart PIN</div>
                                <div class="continueBtn icn">chevron_forward</div>
                            </div>
                     </div>
                    </div>

                    <div class="side">
                        <div class="methodApp">
                        <div class="funside">
                            <div class="icn">android_wifi_3_bar</div>
                            <span>You can continue to the application once devices are connected.</span>
                        </div></div>
                    </div>
                </div>
            </div>
        </div>`
    }
}
class STabHostApp {
    html() {
        return `
        <div class="app tab-host">
            <div class="label">Local Tab Session</div>
            <div class="status" id="status">Waiting...</div>
        </div>
        `
    }

    mount(container) {
        this.container = container
    }

    onLoad() {
        this.channel = new BroadcastChannel("cyrus-auto")
        this.id = crypto.randomUUID()
        this.connected = false

        this.channel.onmessage = e => {
            const msg = e.data
            if (msg.from === this.id) return
            if (this.connected) return

            if (msg.type === "hello") {
                this.connected = true

                this.channel.postMessage({
                    type: "peer-info",
                    from: this.id,
                    to: msg.from,
                    peerId: window.CYRUS_PEER_ID,
                    role: "host"
                })

                this.container.querySelector("#status").textContent = "Connected"
                document.dispatchEvent(new Event("CyrusConnected"))
                dialog.close()
            }
        }
    }
}
class STabJoinApp {
    html() {
        return `
        <div class="app tab-join">
            <div class="label">Local Tab Session</div>
            <div class="status" id="status">Searching...</div>
        </div>
        `
    }

    mount(container) {
        this.container = container
    }

    onLoad() {
        this.channel = new BroadcastChannel("cyrus-auto")
        this.id = crypto.randomUUID()
        this.connected = false

        this.channel.onmessage = e => {
            const msg = e.data
            if (msg.from === this.id) return
            if (this.connected) return

            if (msg.type === "peer-info" && msg.to === this.id) {
                this.connected = true

                const remotePeerId = msg.peerId

                window.CyrusPeerManager.connectTo(remotePeerId)

                this.container.querySelector("#status").textContent = "Connected"
                document.dispatchEvent(new Event("CyrusConnected"))
                dialog.close()
            }
        }

        this.channel.postMessage({
            type: "hello",
            from: this.id
        })
    }
}

async function deriveId(code) {
    const enc = new TextEncoder().encode(code.toUpperCase())
    const hash = await crypto.subtle.digest("SHA-256", enc)
    const bytes = Array.from(new Uint8Array(hash))
    return bytes.slice(0, 16).map(b => b.toString(16).padStart(2, "0")).join("")
}

function randomCode(len = 8) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let out = ""
    for (let i = 0; i < len; i++)
        out += chars[Math.floor(Math.random() * chars.length)]
    return out
}

class SPinGenerateApp {
    html() {
        return `
        <div class="app spin-generate">
            <div class="label">Here's your Smart PIN:</div>
            <div class="code" id="roomCode"></div>
            <div class="status" id="status">Waiting...</div>
        </div>`
    }

    mount(container) {
        this.container = container
    }

    async onLoad() {
        const code = randomCode(8)
        this.container.querySelector("#roomCode").textContent = code

        const id = await deriveId(code)

        if (window.CyrusPeerManager.peer?.destroyed === false)
            window.CyrusPeerManager.peer.destroy()

        const peer = new Peer(id, { config: { iceServers: [] } })
        window.CyrusPeerManager.peer = peer

        peer.on("open", () => {
            window.CYRUS_PEER_ID = peer.id
        })

        peer.on("connection", conn => {
            window.CyrusPeerManager.attachConnection(conn)
            this.container.querySelector("#status").textContent = "Connected"
            document.dispatchEvent(new Event("CyrusConnected"))
            dialog.close()
        })
    }
}

class SPinConnectApp {
    html() {
        return `
        <div class="app spin-connect">
            <div class="label">Enter your Smart PIN:</div>
            <input class="pinput" maxlength="8" placeholder="00000000"/>
            <button>Connect</button>
            <div class="status"></div>
        </div>`
    }

    mount(container) {
        this.container = container
    }

    onLoad() {
        const btn = this.container.querySelector("button")
        btn.onclick = () => this.join()
    }

    async join() {
        const input = this.container.querySelector("input")
        const status = this.container.querySelector(".status")
        const code = input.value.trim().toUpperCase()
        if (code.length !== 8) return

        const id = await deriveId(code)
        const pm = window.CyrusPeerManager

        pm.connectTo(id)
        status.textContent = "Connecting..."
        pm.on('connected', () => {
            status.textContent = "Connected"
            document.dispatchEvent(new Event("CyrusConnected"))
            dialog.close()
        })
    }
}

const dialog = new CyrusDialog('cyrus-root');
document.addEventListener("DOMContentLoaded", () => {
    dialog.registerApp('stab-host', new STabHostApp())
    dialog.registerApp('stab-join', new STabJoinApp())
    dialog.registerApp('spin-generate', new SPinGenerateApp())
    dialog.registerApp('spin-connect', new SPinConnectApp())

    const fileInput = document.getElementById('videoSource')
    const roleSpan = document.getElementById('roleSpan')
    const video = document.querySelector('#video')

    document.addEventListener('CyrusReady', () => {
        const pm = window.CyrusPeerManager
        const assembler = new MediaAssembler(video, pm)
        const streamer = new FileStreamer(pm)

        fileInput.addEventListener('change', async e => {
            const file = e.target.files[0]
            if (!file) return
            if (!pm.conn?.open) return

            await streamer.streamFile(file, pm.conn.peer)
        })
        pm.on('stream', () => roleSpan.textContent = 'Receiver')
    })
})