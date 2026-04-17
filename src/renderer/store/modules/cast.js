const state = {
  isOpen: false,
  devices: [],
  activeDeviceId: null,
  activeDeviceName: null,
  error: null,
  videoId: null,
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

  getCastVideoId(state) {
    return state.videoId
  },

  getCastVideoTitle(state) {
    return state.videoTitle
  },

  getCastAnchorRect(state) {
    return state.anchorRect
  },

  getIsCasting(state) {
    return state.activeDeviceId != null
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
      if (typeof state.videoId !== 'string' || state.videoId.length === 0) {
        throw new Error('No video is available to cast')
      }

      if (process.env.IS_ELECTRON) {
        const deviceId = device.id
        const deviceApplicationUrl = device.applicationUrl
        const videoId = state.videoId
        await window.ftElectron.connectCastDevice({ deviceId, deviceApplicationUrl, videoId })
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

  setCastMediaDetails({ commit }, { videoId, title }) {
    commit('setCastVideoId', videoId)
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

  setCastVideoId(state, value) {
    state.videoId = typeof value === 'string' && value.length > 0 ? value : null
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
