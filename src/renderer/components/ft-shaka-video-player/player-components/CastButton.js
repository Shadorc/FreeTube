import shaka from 'shaka-player'

import i18n from '../../../i18n/index'
import { PlayerIcons } from '../../../../constants'

export class CastButton extends shaka.ui.Element {
  /**
   * @param {EventTarget} events
   * @param {HTMLElement} parent
   * @param {shaka.ui.Controls} controls
   */
  constructor(events, parent, controls) {
    super(parent, controls)

    /** @private */
    this.button_ = document.createElement('button')
    this.button_.classList.add('ft-cast-button', 'shaka-tooltip')

    /** @private */
    this.icon_ = new shaka.ui.Icon(this.button_, PlayerIcons.CAST)

    const label = document.createElement('label')
    label.classList.add(
      'shaka-overflow-button-label',
      'shaka-overflow-menu-only',
      'shaka-simple-overflow-button-label-inline'
    )

    /** @private */
    this.nameSpan_ = document.createElement('span')
    label.appendChild(this.nameSpan_)

    /** @private */
    this.currentState_ = document.createElement('span')
    this.currentState_.classList.add('shaka-current-selection-span')
    label.appendChild(this.currentState_)

    this.button_.appendChild(label)
    this.parent.appendChild(this.button_)

    this.eventManager.listen(this.button_, 'click', async () => {

      try {
        const devices = await window.ftElectron.discoverCastDevices()
        console.log('Discovered devices:', devices)
        // Handle devices here (show dialog, etc.)
      } catch (error) {
        console.error('Device discovery failed:', error)
      }
    })

    this.eventManager.listen(events, 'localeChanged', () => {
      this.updateLocalisedStrings_()
    })

    if (this.isSubMenu) {
      this.eventManager.listen(this.controls, 'submenuopen', () => {
        this.updateSubmenuVisibility_()
      })

      this.eventManager.listen(this.controls, 'submenuclose', () => {
        this.updateSubmenuVisibility_()
      })
    }

    this.updateLocalisedStrings_()
  }

  /** @private */
  updateLocalisedStrings_() {
    const isCasting = false // this.castProxy_.isCasting()

    this.nameSpan_.textContent = i18n.global.t('Video.Player.Cast')

    this.icon_.use(isCasting ? PlayerIcons.CAST_CONNECTED : PlayerIcons.CAST)

    this.currentState_.textContent = this.localization.resolve(isCasting ? 'ON' : 'OFF')

    this.button_.ariaLabel = isCasting
      ? i18n.global.t('Video.Player.Stop casting')
      : i18n.global.t('Video.Player.Cast to TV')
  }

  /** @private */
  updateSubmenuVisibility_() {
    if (this.isSubMenuOpened) {
      this.button_.classList.add('shaka-hidden')
    } else {
      this.updateVisibilityFromAvailability_()
    }
  }
}