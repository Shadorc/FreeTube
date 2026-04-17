const state = {
  isOpen: false,
  isDiscovering: false,
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

  getCastDiscovering(state) {
    return state.isDiscovering
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
  ensureCastDiscoveryListener({ commit }) {
    if (process.env.IS_ELECTRON) {
      window.ftElectron.handleCastDeviceDiscovered((device) => {
        if (!device) {
          return
        }

        commit('addCastDevice', device)
        commit('setCastDiscovering', false)
      })
    }
  },

  async openCastPopover({ commit, dispatch }, anchorRect) {
    dispatch('ensureCastDiscoveryListener')

    commit('setCastAnchorRect', anchorRect)
    commit('setCastPopoverOpen', true)
    commit('setCastError', null)
    commit('setCastDevices', [])
    commit('setCastDiscovering', true)

    if (process.env.IS_ELECTRON) {
      window.ftElectron.discoverCastDevice()
    }

    setTimeout(() => {
      commit('setCastDiscovering', false)
    }, 5500)
  },

  async connectToDevice({ commit, state }, device) {
    commit('setCastError', null)

    try {
      if (typeof state.videoId !== 'string' || state.videoId.length === 0) {
        throw new Error('No video is available to cast')
      }

      if (process.env.IS_ELECTRON) {
        await window.ftElectron.connectCastDevice(device, state.videoId)
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

  dispatchCastStatusChanged(context) {
    const isCasting = context.state.activeDeviceId != null
    document.dispatchEvent(new CustomEvent('ft-caststatuschanged', {
      detail: {
        isCasting,
        deviceName: context.state.activeDeviceName
      }
    }))
  }
}

const mutations = {
  setCastPopoverOpen(state, value) {
    state.isOpen = value
  },

  setCastDiscovering(state, value) {
    state.isDiscovering = value
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
