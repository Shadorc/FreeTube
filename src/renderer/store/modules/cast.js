const state = {
  isOpen: false,
  devices: [],
  activeDeviceId: null,
  activeDeviceName: null,
  error: null,
  videoUrl: null,
  videoTitle: null,
  anchorRect: null
}

const getters = {
  getCastPopoverOpen(state) {
    return state.isOpen
  },

  getCastDevices(state) {
    return state.devices
  },

  getActiveDeviceId(state) {
    return state.activeDeviceId
  },

  getActiveDeviceName(state) {
    return state.activeDeviceName
  },

  getCastError(state) {
    return state.error
  },

  getCastAnchorRect(state) {
    return state.anchorRect
  }
}

const actions = {
  async openCastPopover({ commit }, anchorRect) {
    if (process.env.IS_ELECTRON) {
      // TODO: Register only once
      window.ftElectron.handleCastDeviceDiscovered((device) => {
        if (!device) {
          return
        }

        commit('addCastDevice', device)
      })
    }

    commit('setCastAnchorRect', anchorRect)
    commit('setCastPopoverOpen', true)
    commit('setCastError', null)
    commit('setCastDevices', [])

    if (process.env.IS_ELECTRON) {
      window.ftElectron.discoverCastDevice()
    }
  },

  async connectToDevice({ commit, dispatch, state }, device) {
    commit('setCastError', null)

    try {
      if (process.env.IS_ELECTRON) {
        const deviceAddress = device.address
        const videoUrl = state.videoUrl
        await window.ftElectron.connectCastDevice({ deviceAddress, videoUrl })
      }
      commit('setActiveDevice', { id: device.id, name: device.name })
      commit('setCastPopoverOpen', false)
      dispatch('dispatchCastStatusChanged')
    } catch (err) {
      console.error(err)
      const errorMessage = err?.message ?? 'Connection failed'
      commit('setCastError', errorMessage)
    }
  },

  async stopCasting({ commit, dispatch }) {
    commit('setCastError', null)

    try {
      if (process.env.IS_ELECTRON) {
        await window.ftElectron.stopCasting()
      }
      commit('clearActiveDevice')
      dispatch('dispatchCastStatusChanged')
    } catch (err) {
      console.error(err)
      const errorMessage = err?.message ?? 'Stop failed'
      commit('setCastError', errorMessage)
    }
  },

  closeCastPopover({ commit }) {
    commit('setCastPopoverOpen', false)
  },

  setCastMediaDetails({ commit }, { videoUrl, title }) {
    commit('setCastVideoUrl', videoUrl)
    commit('setCastVideoTitle', title)
  },

  dispatchCastStatusChanged({ state }) {
    const isCasting = state.activeDeviceId != null
    const deviceName = state.activeDeviceName
    window.ftElectron.castStatusChanged(isCasting, deviceName)
  }
}

const mutations = {
  setCastPopoverOpen(state, value) {
    state.isOpen = value
  },

  addCastDevice(state, device) {
    if (!state.devices.some(({ id }) => id === device.id)) {
      state.devices.push(device)
    }
  },

  setCastDevices(state, devices) {
    state.devices = devices
  },

  setActiveDevice(state, { id, name }) {
    state.activeDeviceId = id
    state.activeDeviceName = name
  },

  clearActiveDevice(state) {
    state.activeDeviceId = null
    state.activeDeviceName = null
  },

  setCastError(state, value) {
    state.error = value
  },

  setCastVideoUrl(state, value) {
    state.videoUrl = typeof value === 'string' && value.length > 0 ? value : null
  },

  setCastVideoTitle(state, value) {
    state.videoTitle = typeof value === 'string' && value.length > 0 ? value : null
  },

  setCastAnchorRect(state, value) {
    state.anchorRect = value
  }
}

export default {
  state,
  getters,
  actions,
  mutations
}
