<template>
  <Teleport to="body">
    <Transition name="cast-backdrop">
      <button
        v-if="isOpen"
        type="button"
        class="cast-popover__backdrop"
        @click="closeCastPopover"
      />
    </Transition>

    <Transition name="cast-sheet">
      <div
        v-if="isOpen"
        ref="popoverRef"
        class="cast-popover"
        :style="popoverStyle"
        role="dialog"
        aria-modal="false"
        :aria-label="$t('Video.Player.Cast to TV')"
      >
        <div class="cast-popover__header">
          <span class="cast-popover__title">
            {{ $t('Video.Player.Select a device') }}
          </span>
        </div>

        <div
          v-if="error"
          class="cast-popover__status cast-popover__status--error"
        >
          <font-awesome-icon :icon="['fas', 'circle-exclamation']" />
          {{ error }}
          <button
            class="cast-popover__retry"
            :aria-label="$t('Video.Player.Retry')"
            :title="$t('Video.Player.Retry')"
            @click="retry"
          >
            <font-awesome-icon :icon="['fas', 'rotate-right']" />
          </button>
        </div>

        <div
          v-else-if="devices.length === 0"
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

        <ul
          v-else
          class="cast-popover__list"
          role="listbox"
        >
          <li
            v-for="device in devices"
            :key="device.id"
            class="cast-popover__item"
            :class="{ 'cast-popover__item--active': activeDeviceId === device.id }"
            role="option"
            :aria-selected="activeDeviceId === device.id"
            tabindex="0"
            @click="handleDeviceClick(device)"
            @keydown.enter.space.prevent="handleDeviceClick(device)"
          >
            <span
              class="cast-popover__device-icon"
              aria-hidden="true"
            >
              <font-awesome-icon :icon="['fas', 'display']" />
            </span>
            <span class="cast-popover__device-name">{{ device.name }}</span>
            <span
              v-if="activeDeviceId === device.id"
              class="cast-popover__active-badge"
              :aria-label="$t('Video.Player.Connected')"
              :title="$t('Video.Player.Connected')"
            >
              <font-awesome-icon :icon="['fas', 'check']" />
            </span>
          </li>
        </ul>

        <div
          v-if="activeDeviceId"
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
import store from '../../store/index'

const isOpen = computed(() => store.getters.getCastPopoverOpen)
const devices = computed(() => store.getters.getCastDevices)
const activeDeviceId = computed(() => store.getters.getActiveDeviceId)
const error = computed(() => store.getters.getCastError)
const anchorRect = computed(() => store.getters.getCastAnchorRect)

const POPOVER_WIDTH = 300
const POPOVER_OFFSET = 12

const popoverStyle = computed(() => {
  const rect = anchorRect.value
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
  if (activeDeviceId.value === device.id) {
    await store.dispatch('stopCasting')
  } else {
    await store.dispatch('connectToDevice', device)
  }
}

async function retry() {
  await store.dispatch('openCastPopover', anchorRect)
}

async function stopCasting() {
  await store.dispatch('stopCasting')
}

function closeCastPopover() {
  store.dispatch('closeCastPopover')
}

function onKeydown(e) {
  if (e.key === 'Escape' && isOpen.value) {
    closeCastPopover()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped src="./FtCastPopover.css" />
