const { contextBridge, ipcRenderer } = require("electron")

// The hidden WebRTC host window's link to main (rtc_host.js): commands in,
// events out. The window loads only rtc_host_page.js.
contextBridge.exposeInMainWorld("rtcHost", {
  onCommand(handler) {
    ipcRenderer.on("junon:rtc-host-command", (event, command) => handler(command))
  },

  emit(message) {
    ipcRenderer.send("junon:rtc-host-event", message)
  }
})
