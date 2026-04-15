<template>
  <Teleport to="body">
    <!-- Backdrop (click-outside) -->
    <Transition name="cast-backdrop">
      <div
        v-if="castStore.isOpen"
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
            @click="retry"
          >
            {{ $t('Video.Player.Retry') }}
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
            @click="retry"
          >
            {{ $t('Video.Player.Retry') }}
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
            >
              {{ $t('Video.Player.Connected') }}
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

        <!-- Arrow pointing down toward the button -->
        <span
          class="cast-popover__arrow"
          :style="arrowStyle"
          aria-hidden="true"
        />
      </div>
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

    const POPOVER_WIDTH = 300
    const POPOVER_OFFSET = 12 // gap between button top and popover bottom

    // Position the popover above the anchor button, centred on it
    const popoverStyle = computed(() => {
      const rect = castStore.anchorRect
      if (!rect) return { display: 'none' }

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

    // Arrow sits at the bottom of the popover, pointing down at the button
    const arrowStyle = computed(() => {
      const rect = castStore.anchorRect
      if (!rect) return {}
      const vpW = window.innerWidth
      const clampedLeft = Math.max(8, Math.min(
        rect.left + rect.width / 2 - POPOVER_WIDTH / 2,
        vpW - POPOVER_WIDTH - 8
      ))
      const arrowLeft = (rect.left + rect.width / 2) - clampedLeft
      return { left: `${arrowLeft}px` }
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
      if (e.key === 'Escape' && castStore.isOpen) closeCastPopover()
    }

    onMounted(() => window.addEventListener('keydown', onKeydown))
    onUnmounted(() => window.removeEventListener('keydown', onKeydown))

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
  --cp-bg:          #1c1c1c;
  --cp-text:        #ffffff;
  --cp-text-muted:  #888888;
  --cp-border:      rgba(255, 255, 255, 0.08);
  --cp-accent:      #4fc3a1;
  --cp-accent-stop: #e05555;
  --cp-item-hover:  rgba(255, 255, 255, 0.06);
  --cp-active-bg:   rgba(79, 195, 161, 0.12);
  --cp-radius:      16px;
  --cp-shadow:      0 8px 40px rgba(0, 0, 0, 0.7), 0 2px 8px rgba(0, 0, 0, 0.4);
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
  border-radius: var(--cp-radius);
  box-shadow: var(--cp-shadow);
  color: var(--cp-text);
  font-family: inherit;
  max-height: 420px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Drag handle ── */
.cast-popover__handle {
  width: 36px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  margin: 10px auto 0;
  flex-shrink: 0;
}

/* ── Header ── */
.cast-popover__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px 8px;
  flex-shrink: 0;
}

.cast-popover__title {
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

/* ── Spinner ── */
.cast-popover__spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2.5px solid rgba(255, 255, 255, 0.15);
  border-top-color: rgba(255, 255, 255, 0.75);
  border-radius: 50%;
  animation: cp-spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes cp-spin {
  to { transform: rotate(360deg); }
}

/* ── Status states ── */
.cast-popover__status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 20px;
  color: var(--cp-text-muted);
  font-size: 14px;
  text-align: center;
}

.cast-popover__status--error { color: #e07070; }

/* ── Retry ── */
.cast-popover__retry {
  background: none;
  border: 1px solid var(--cp-border);
  color: var(--cp-accent);
  cursor: pointer;
  padding: 5px 16px;
  border-radius: 20px;
  font-size: 12px;
  margin-top: 4px;
  transition: background 0.15s, border-color 0.15s;
}
.cast-popover__retry:hover {
  background: rgba(79, 195, 161, 0.1);
  border-color: var(--cp-accent);
}

/* ── Device list ── */
.cast-popover__list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0 10px 10px;
  overflow-y: auto;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
}

.cast-popover__item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
  outline: none;
}
.cast-popover__item:hover,
.cast-popover__item:focus-visible { background: var(--cp-item-hover); }
.cast-popover__item--active       { background: var(--cp-active-bg); }

/* ── Device icon ── */
.cast-popover__device-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
  color: var(--cp-text);
}

/* ── Device name ── */
.cast-popover__device-name {
  flex: 1;
  font-size: 17px;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Active badge ── */
.cast-popover__active-badge {
  font-size: 10px;
  font-weight: 600;
  color: var(--cp-accent);
  background: rgba(79, 195, 161, 0.15);
  border: 1px solid rgba(79, 195, 161, 0.3);
  border-radius: 10px;
  padding: 2px 8px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Stop footer ── */
.cast-popover__footer {
  border-top: 1px solid var(--cp-border);
  padding: 8px 10px;
  flex-shrink: 0;
}
.cast-popover__stop {
  width: 100%;
  background: rgba(224, 85, 85, 0.1);
  border: 1px solid rgba(224, 85, 85, 0.25);
  color: var(--cp-accent-stop);
  cursor: pointer;
  padding: 9px;
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
  background: rgba(224, 85, 85, 0.2);
  border-color: rgba(224, 85, 85, 0.5);
}

/* ── Arrow (points down toward the button) ── */
.cast-popover__arrow {
  position: absolute;
  bottom: -6px;
  width: 12px;
  height: 12px;
  background: var(--cp-bg);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  transform: translateX(-50%) rotate(45deg);
  pointer-events: none;
}

/* ── Transitions ── */
.cast-backdrop-enter-active,
.cast-backdrop-leave-active { transition: opacity 0.2s ease; }
.cast-backdrop-enter-from,
.cast-backdrop-leave-to     { opacity: 0; }

.cast-sheet-enter-active,
.cast-sheet-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.cast-sheet-enter-from,
.cast-sheet-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
