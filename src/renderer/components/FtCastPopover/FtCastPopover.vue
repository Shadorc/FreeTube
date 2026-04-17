<template>
  <Teleport to="body">
    <!-- Backdrop (click-outside) -->
    <Transition name="cast-backdrop">
      <button
        v-if="castStore.isOpen"
        type="button"
        class="cast-popover__backdrop"
        @click="closeCastPopover"
      />
    </Transition>

    <!-- Floating popover -->
    <Transition name="cast-sheet">
      <div
        v-if="castStore.isOpen"
        ref="popoverRef"
        class="cast-popover"
        :style="popoverStyle"
        role="dialog"
        aria-modal="false"
        :aria-label="$t('Video.Player.Cast to TV')"
      >
        <!-- Title row -->
        <div class="cast-popover__header">
          <span class="cast-popover__title">
            {{ $t('Video.Player.Select a device') }}
          </span>
          <span
            v-if="castStore.isDiscovering"
            class="cast-popover__spinner"
            aria-hidden="true"
          />
        </div>

        <!-- Error -->
        <div
          v-if="castStore.error"
          class="cast-popover__status cast-popover__status--error"
        >
          <font-awesome-icon :icon="['fas', 'circle-exclamation']" />
          {{ castStore.error }}
          <button
            class="cast-popover__retry"
            :aria-label="$t('Video.Player.Retry')"
            :title="$t('Video.Player.Retry')"
            @click="retry"
          >
            <font-awesome-icon :icon="['fas', 'rotate-right']" />
          </button>
        </div>

        <!-- Empty -->
        <div
          v-else-if="!castStore.isDiscovering && castStore.devices.length === 0"
          class="cast-popover__status cast-popover__status--empty"
        >
          <font-awesome-icon :icon="['fas', 'tv']" />
          {{ $t('Video.Player.No devices found') }}
          <button
            class="cast-popover__retry"
            :aria-label="$t('Video.Player.Retry')"
            :title="$t('Video.Player.Retry')"
            @click="retry"
          >
            <font-awesome-icon :icon="['fas', 'rotate-right']" />
          </button>
        </div>

        <!-- Device list -->
        <ul
          v-else
          class="cast-popover__list"
          role="listbox"
        >
          <li
            v-for="device in castStore.devices"
            :key="device.id"
            class="cast-popover__item"
            :class="{ 'cast-popover__item--active': castStore.activeDeviceId === device.id }"
            role="option"
            :aria-selected="castStore.activeDeviceId === device.id"
            tabindex="0"
            @click="handleDeviceClick(device)"
            @keydown.enter.space.prevent="handleDeviceClick(device)"
          >
            <span
              class="cast-popover__device-icon"
              aria-hidden="true"
            >
              <font-awesome-icon :icon="deviceIcon(device)" />
            </span>
            <span class="cast-popover__device-name">{{ device.name }}</span>
            <span
              v-if="castStore.activeDeviceId === device.id"
              class="cast-popover__active-badge"
              :aria-label="$t('Video.Player.Connected')"
              :title="$t('Video.Player.Connected')"
            >
              <font-awesome-icon :icon="['fas', 'check']" />
            </span>
          </li>
        </ul>

        <!-- Stop casting footer -->
        <div
          v-if="castStore.activeDeviceId"
          class="cast-popover__footer"
        >
          <button
            class="cast-popover__stop"
            @click="stopCasting"
          >
            <font-awesome-icon :icon="['fas', 'stop']" />
            {{ $t('Video.Player.Stop casting') }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import {
  castStore,
  openCastPopover,
  connectToDevice,
  stopCasting as doStop,
  closeCastPopover,
} from '../ft-shaka-video-player/player-components/castStore'

const POPOVER_WIDTH = 300
const POPOVER_OFFSET = 12

// Position the popover above the anchor button, centred on it
const popoverStyle = computed(() => {
  const rect = castStore.anchorRect
  if (!rect) {
    return { display: 'none' }
  }

  const vpW = window.innerWidth

  let left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2
  left = Math.max(8, Math.min(left, vpW - POPOVER_WIDTH - 8))

  const bottom = window.innerHeight - rect.top + POPOVER_OFFSET

  return {
    position: 'fixed',
    width: `${POPOVER_WIDTH}px`,
    bottom: `${bottom}px`,
    left: `${left}px`,
  }
})

async function handleDeviceClick(device) {
  if (castStore.activeDeviceId === device.id) {
    await doStop()
  } else {
    await connectToDevice(device)
  }
}

async function retry() {
  await openCastPopover(castStore.anchorRect)
}

async function stopCasting() {
  await doStop()
}

function onKeydown(e) {
  if (e.key === 'Escape' && castStore.isOpen) {
    closeCastPopover()
  }
}

/**
 * @param {object} device - The device object
 * @returns {string[]} - Font Awesome icon array [family, name]
 */
function deviceIcon(device) {
  const type = (device.type ?? '').toLowerCase()

  if (type.includes('tv') || type.includes('chromecast')) {
    return ['fas', 'tv']
  }

  if (type.includes('speaker') || type.includes('audio')) {
    return ['fas', 'volume-high']
  }

  if (type.includes('phone') || type.includes('mobile')) {
    return ['fas', 'mobile']
  }

  return ['fas', 'display']
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped src="./FtCastPopover.css" />
