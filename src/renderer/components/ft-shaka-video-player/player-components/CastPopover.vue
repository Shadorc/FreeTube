<template>
  <Teleport to="body">
    <Transition name="cast-fade">
      <div
        v-if="castStore.isOpen"
        ref="popoverRef"
        class="cast-popover"
        :style="popoverStyle"
        role="dialog"
        aria-modal="false"
        :aria-label="$t('Video.Player.Cast to TV')"
      >
        <!-- Header -->
        <div class="cast-popover__header">
          <span class="cast-popover__title">
            <font-awesome-icon :icon="['fas', 'cast']" class="cast-popover__title-icon" />
            {{ $t('Video.Player.Cast to TV') }}
          </span>
          <button
            class="cast-popover__close"
            :aria-label="$t('Close')"
            @click="closeCastPopover"
          >
            <font-awesome-icon :icon="['fas', 'xmark']" />
          </button>
        </div>

        <!-- Discovering -->
        <div v-if="castStore.isDiscovering" class="cast-popover__status">
          <span class="cast-popover__spinner" aria-hidden="true" />
          {{ $t('Video.Player.Searching for devices') }}
        </div>

        <!-- Error -->
        <div v-else-if="castStore.error" class="cast-popover__status cast-popover__status--error">
          <font-awesome-icon :icon="['fas', 'circle-exclamation']" />
          {{ castStore.error }}
          <button class="cast-popover__retry" @click="retry">
            {{ $t('Video.Player.Retry') }}
          </button>
        </div>

        <!-- Empty -->
        <div
          v-else-if="castStore.devices.length === 0"
          class="cast-popover__status cast-popover__status--empty"
        >
          <font-awesome-icon :icon="['fas', 'tv']" />
          {{ $t('Video.Player.No devices found') }}
          <button class="cast-popover__retry" @click="retry">
            {{ $t('Video.Player.Retry') }}
          </button>
        </div>

        <!-- Device list -->
        <ul v-else class="cast-popover__list" role="listbox">
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
            <span class="cast-popover__device-icon" aria-hidden="true">
              <font-awesome-icon :icon="deviceIcon(device)" />
            </span>
            <span class="cast-popover__device-info">
              <span class="cast-popover__device-name">{{ device.name }}</span>
              <span class="cast-popover__device-type">{{ device.type }}</span>
            </span>
            <span
              v-if="castStore.activeDeviceId === device.id"
              class="cast-popover__active-badge"
            >
              {{ $t('Video.Player.Connected') }}
            </span>
          </li>
        </ul>

        <!-- Stop casting footer -->
        <div v-if="castStore.activeDeviceId" class="cast-popover__footer">
          <button class="cast-popover__stop" @click="stopCasting">
            <font-awesome-icon :icon="['fas', 'stop']" />
            {{ $t('Video.Player.Stop casting') }}
          </button>
        </div>

        <!-- Arrow -->
        <span class="cast-popover__arrow" :style="arrowStyle" aria-hidden="true" />
      </div>
    </Transition>

    <!-- Backdrop (click-outside to close) -->
    <Transition name="cast-fade">
      <div
        v-if="castStore.isOpen"
        class="cast-popover__backdrop"
        @click="closeCastPopover"
        @keydown.escape="closeCastPopover"
      />
    </Transition>
  </Teleport>
</template>

<script>
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue'
import { castStore, openCastPopover, connectToDevice, stopCasting as doStop, closeCastPopover } from './castStore'

export default defineComponent({
  name: 'CastPopover',

  setup() {
    const popoverRef = ref(null)

    // ─── Positioning ─────────────────────────────────────────────────────────
    const POPOVER_WIDTH = 280
    const POPOVER_OFFSET = 10 // gap between button and popover

    const popoverStyle = computed(() => {
      const rect = castStore.anchorRect
      if (!rect) return { display: 'none' }

      const vpW = window.innerWidth
      const vpH = window.innerHeight

      // Prefer opening above the button (player controls are at the bottom)
      let top = rect.top - POPOVER_OFFSET
      let left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2

      // Clamp horizontal
      left = Math.max(8, Math.min(left, vpW - POPOVER_WIDTH - 8))

      return {
        position: 'fixed',
        width: `${POPOVER_WIDTH}px`,
        top: `${top}px`,
        left: `${left}px`,
        transform: 'translateY(-100%)',
      }
    })

    const arrowStyle = computed(() => {
      const rect = castStore.anchorRect
      if (!rect) return {}
      const vpW = window.innerWidth
      const clampedLeft = Math.max(8, Math.min(rect.left + rect.width / 2 - POPOVER_WIDTH / 2, vpW - POPOVER_WIDTH - 8))
      const arrowLeft = (rect.left + rect.width / 2) - clampedLeft
      return { left: `${arrowLeft}px` }
    })

    // ─── Actions ─────────────────────────────────────────────────────────────
    async function handleDeviceClick(device) {
      if (castStore.activeDeviceId === device.id) {
        // Clicking active device disconnects
        await doStop()
      } else {
        await connectToDevice(device)
      }
    }

    async function retry() {
      const rect = castStore.anchorRect
      await openCastPopover(rect)
    }

    async function stopCasting() {
      await doStop()
    }

    // ─── Keyboard dismiss ─────────────────────────────────────────────────────
    function onKeydown(e) {
      if (e.key === 'Escape' && castStore.isOpen) {
        closeCastPopover()
      }
    }

    onMounted(() => window.addEventListener('keydown', onKeydown))
    onUnmounted(() => window.removeEventListener('keydown', onKeydown))

    // ─── Helpers ──────────────────────────────────────────────────────────────
    function deviceIcon(device) {
      const t = (device.type ?? '').toLowerCase()
      if (t.includes('tv') || t.includes('chromecast')) return ['fas', 'tv']
      if (t.includes('speaker') || t.includes('audio')) return ['fas', 'volume-high']
      if (t.includes('phone') || t.includes('mobile')) return ['fas', 'mobile']
      return ['fas', 'display']
    }

    return {
      castStore,
      popoverRef,
      popoverStyle,
      arrowStyle,
      handleDeviceClick,
      retry,
      stopCasting,
      closeCastPopover,
      deviceIcon,
    }
  }
})
</script>

<style scoped>
/* ── Variables ── */
.cast-popover {
  --cp-bg: #1e1e1e;
  --cp-bg-item: #2a2a2a;
  --cp-bg-item-hover: #333;
  --cp-bg-active: #1a3a2e;
  --cp-accent: #4fc3a1;
  --cp-accent-stop: #e05555;
  --cp-text: #f0f0f0;
  --cp-text-muted: #888;
  --cp-border: rgba(255 255 255 / 0.08);
  --cp-radius: 12px;
  --cp-shadow: 0 8px 32px rgba(0 0 0 / 0.6), 0 2px 8px rgba(0 0 0 / 0.4);
}

/* ── Backdrop ── */
.cast-popover__backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

/* ── Popover shell ── */
.cast-popover {
  z-index: 9999;
  background: var(--cp-bg);
  border: 1px solid var(--cp-border);
  border-radius: var(--cp-radius);
  box-shadow: var(--cp-shadow);
  color: var(--cp-text);
  font-family: inherit;
  font-size: 14px;
  overflow: hidden;
  /* Prevent the popover from growing too tall */
  max-height: 360px;
  display: flex;
  flex-direction: column;
}

/* ── Arrow ── */
.cast-popover__arrow {
  position: absolute;
  bottom: -6px;
  width: 12px;
  height: 12px;
  background: var(--cp-bg);
  border-right: 1px solid var(--cp-border);
  border-bottom: 1px solid var(--cp-border);
  transform: translateX(-50%) rotate(45deg);
  pointer-events: none;
}

/* ── Header ── */
.cast-popover__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--cp-border);
  flex-shrink: 0;
}

.cast-popover__title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--cp-accent);
  display: flex;
  align-items: center;
  gap: 7px;
}

.cast-popover__title-icon {
  font-size: 12px;
  opacity: 0.85;
}

.cast-popover__close {
  background: none;
  border: none;
  color: var(--cp-text-muted);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1;
  transition: color 0.15s, background 0.15s;
}

.cast-popover__close:hover {
  color: var(--cp-text);
  background: rgba(255 255 255 / 0.08);
}

/* ── Status states (discovering / error / empty) ── */
.cast-popover__status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 16px;
  color: var(--cp-text-muted);
  font-size: 13px;
  text-align: center;
}

.cast-popover__status--error {
  color: #e07070;
}

.cast-popover__status--empty {
  color: var(--cp-text-muted);
}

/* ── Spinner ── */
.cast-popover__spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255 255 255 / 0.12);
  border-top-color: var(--cp-accent);
  border-radius: 50%;
  animation: cp-spin 0.75s linear infinite;
}

@keyframes cp-spin {
  to { transform: rotate(360deg); }
}

/* ── Retry button ── */
.cast-popover__retry {
  background: none;
  border: 1px solid var(--cp-border);
  color: var(--cp-accent);
  cursor: pointer;
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 12px;
  margin-top: 4px;
  transition: background 0.15s, border-color 0.15s;
}

.cast-popover__retry:hover {
  background: rgba(79 195 161 / 0.1);
  border-color: var(--cp-accent);
}

/* ── Device list ── */
.cast-popover__list {
  list-style: none;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: rgba(255 255 255 / 0.15) transparent;
}

.cast-popover__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  outline: none;
}

.cast-popover__item:hover,
.cast-popover__item:focus-visible {
  background: var(--cp-bg-item-hover);
}

.cast-popover__item--active {
  background: var(--cp-bg-active);
}

.cast-popover__device-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255 255 255 / 0.07);
  border-radius: 6px;
  font-size: 13px;
  color: var(--cp-accent);
  flex-shrink: 0;
}

.cast-popover__item--active .cast-popover__device-icon {
  background: rgba(79 195 161 / 0.18);
}

.cast-popover__device-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.cast-popover__device-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cast-popover__device-type {
  font-size: 11px;
  color: var(--cp-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.cast-popover__active-badge {
  font-size: 10px;
  font-weight: 600;
  color: var(--cp-accent);
  background: rgba(79 195 161 / 0.15);
  border: 1px solid rgba(79 195 161 / 0.3);
  border-radius: 10px;
  padding: 2px 8px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Stop footer ── */
.cast-popover__footer {
  border-top: 1px solid var(--cp-border);
  padding: 8px;
  flex-shrink: 0;
}

.cast-popover__stop {
  width: 100%;
  background: rgba(224 85 85 / 0.1);
  border: 1px solid rgba(224 85 85 / 0.25);
  color: var(--cp-accent-stop);
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.15s, border-color 0.15s;
}

.cast-popover__stop:hover {
  background: rgba(224 85 85 / 0.18);
  border-color: rgba(224 85 85 / 0.5);
}

/* ── Transitions ── */
.cast-fade-enter-active,
.cast-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.cast-fade-enter-from,
.cast-fade-leave-to {
  opacity: 0;
  transform: translateY(calc(-100% + 6px));
}
</style>