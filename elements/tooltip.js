(() => {
  'use strict';

  const popupId = 'mc-tooltip-popup';
  const tooltipStyleId = 'mc-tooltip-styles';
  const focusableSelector = 'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"]';
  const describedByBefore = new WeakMap();
  let activeTrigger = null;
  let activeMode = null;
  let lastPointer = null;
  let lastTouchAt = 0;
  let hideTimer = 0;

  const frameImageUrl = 'https://mcbcode.com/img/tooltip.png';

  function addStyles() {
    if (document.getElementById(tooltipStyleId)) return;

    const style = document.createElement('style');
    style.id = tooltipStyleId;
    style.textContent = `
      #${popupId} {
        position: fixed;
        z-index: 2147483647;
        display: block;
        box-sizing: border-box;
        max-width: min(320px, calc(100vw - 16px));
        padding: 1px 3px; /* adjust these if the text needs more or less breathing room */
        border: 6px solid transparent;
        border-image-source: url("${frameImageUrl}");

        border-image-slice: 4 fill;
        border-width: 9px;
        border-image-width: 9px;

        border-image-repeat: stretch;
        image-rendering: pixelated;
        color: #ffffff;
        font-family: mcfont, Minecraft, Arial, sans-serif;
        font-size: 16px;
        line-height: 1.35;
        letter-spacing: 0;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        pointer-events: none;
        opacity: 0;
        transform: translateY(2px);
        transition: opacity 90ms linear, transform 90ms linear;
        filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.55));
      }
      #${popupId}[hidden] {
        display: none !important;
      }
      #${popupId}.is-visible {
        opacity: 1;
        transform: translateY(0);
      }
      [mctooltip]:focus-visible {
        outline: 2px solid #d6c2ef;
        outline-offset: 3px;
      }
      @media (prefers-reduced-motion: reduce) {
        #${popupId} { transition: none; }
      }
      @media (forced-colors: active) {
        #${popupId} {
          border: 1px solid CanvasText;
          border-image: none;
          background: Canvas;
          color: CanvasText;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function findTrigger(target) {
    return target instanceof Element ? target.closest('[mctooltip]') : null;
  }

  function prepareTrigger(element) {
    if (!(element instanceof Element) || !element.hasAttribute('mctooltip')) return;
    if (!element.matches(focusableSelector)) {
      element.setAttribute('tabindex', '0');
      element.setAttribute('data-mctooltip-added-tabindex', '');
    }
  }

  function prepareTree(node) {
    if (!(node instanceof Element)) return;
    prepareTrigger(node);
    node.querySelectorAll('[mctooltip]').forEach(prepareTrigger);
  }

  function attachDescription(element) {
    describedByBefore.set(element, element.getAttribute('aria-describedby'));
    const ids = (element.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter(Boolean);
    if (!ids.includes(popupId)) ids.push(popupId);
    element.setAttribute('aria-describedby', ids.join(' '));
  }

  function restoreDescription(element) {
    const original = describedByBefore.get(element);
    if (original === null || original === undefined) {
      element.removeAttribute('aria-describedby');
    } else {
      element.setAttribute('aria-describedby', original);
    }
    describedByBefore.delete(element);
  }

  function positionPopup(trigger, point) {
    const popup = document.getElementById(popupId);
    if (!popup || popup.hidden) return;

    const triggerRect = trigger.getBoundingClientRect();
    popup.style.left = '0px';
    popup.style.top = '0px';
    popup.style.visibility = 'hidden';

    const popupRect = popup.getBoundingClientRect();
    const margin = 8;
    let left;
    let top;

    if (point) {
      left = point.x + 14;
      top = point.y + 16;
      if (left + popupRect.width > window.innerWidth - margin) {
        left = point.x - popupRect.width - 14;
      }
      if (top + popupRect.height > window.innerHeight - margin) {
        top = point.y - popupRect.height - 12;
      }
    } else {
      left = triggerRect.left + (triggerRect.width - popupRect.width) / 2;
      top = triggerRect.bottom + 8;
      if (top + popupRect.height > window.innerHeight - margin) {
        top = triggerRect.top - popupRect.height - 8;
      }
    }

    left = Math.max(margin, Math.min(left, window.innerWidth - popupRect.width - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - popupRect.height - margin));
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    popup.style.visibility = 'visible';
  }

  function showTooltip(trigger, mode, point = null) {
    const text = trigger.getAttribute('mctooltip');
    if (text === null || text.trim() === '') return;

    const popup = document.getElementById(popupId);
    if (!popup) return;

    window.clearTimeout(hideTimer);
    if (activeTrigger !== trigger) {
      if (activeTrigger) restoreDescription(activeTrigger);
      activeTrigger = trigger;
      attachDescription(trigger);
    }

    activeMode = mode;
    if (point) lastPointer = point;
    popup.textContent = text;
    popup.setAttribute('aria-hidden', 'false');
    popup.hidden = false;
    positionPopup(trigger, point || (mode === 'pointer' ? lastPointer : null));
    window.requestAnimationFrame(() => {
      if (activeTrigger === trigger) popup.classList.add('is-visible');
    });
  }

  function hideTooltip() {
    const popup = document.getElementById(popupId);
    if (!popup || !activeTrigger) return;

    const oldTrigger = activeTrigger;
    activeTrigger = null;
    activeMode = null;
    lastPointer = null;
    restoreDescription(oldTrigger);
    popup.classList.remove('is-visible');
    popup.setAttribute('aria-hidden', 'true');
    hideTimer = window.setTimeout(() => {
      if (!activeTrigger) popup.hidden = true;
    }, 110);
  }

  function initialize() {
    if (!document.body || document.getElementById(popupId)) return;
    addStyles();

    const popup = document.createElement('div');
    popup.id = popupId;
    popup.setAttribute('role', 'tooltip');
    popup.setAttribute('aria-hidden', 'true');
    popup.hidden = true;
    document.body.appendChild(popup);

    document.querySelectorAll('[mctooltip]').forEach(prepareTrigger);

    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === 'childList') {
          record.addedNodes.forEach(prepareTree);
        } else if (record.type === 'attributes') {
          const element = record.target;
          if (element.hasAttribute('mctooltip')) {
            prepareTrigger(element);
            if (element === activeTrigger) showTooltip(element, activeMode, lastPointer);
          } else {
            if (element === activeTrigger) hideTooltip();
            if (element.hasAttribute('data-mctooltip-added-tabindex')) {
              element.removeAttribute('tabindex');
              element.removeAttribute('data-mctooltip-added-tabindex');
            }
          }
        }
      });
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['mctooltip']
    });

    document.addEventListener('pointerover', (event) => {
      if (event.pointerType === 'touch') return;
      const trigger = findTrigger(event.target);
      if (trigger) showTooltip(trigger, 'pointer', { x: event.clientX, y: event.clientY });
    });

    document.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch' || activeMode !== 'pointer') return;
      const trigger = findTrigger(event.target);
      if (trigger && trigger === activeTrigger) {
        showTooltip(trigger, 'pointer', { x: event.clientX, y: event.clientY });
      }
    });

    document.addEventListener('pointerout', (event) => {
      if (activeMode !== 'pointer') return;
      const trigger = findTrigger(event.target);
      if (trigger === activeTrigger && (!event.relatedTarget || !trigger.contains(event.relatedTarget))) {
        hideTooltip();
      }
    });

    document.addEventListener('pointerdown', (event) => {
      const trigger = findTrigger(event.target);
      if (event.pointerType === 'touch') {
        lastTouchAt = Date.now();
        if (!trigger) {
          hideTooltip();
        } else if (activeTrigger === trigger && activeMode === 'touch') {
          hideTooltip();
        } else {
          const rect = trigger.getBoundingClientRect();
          showTooltip(trigger, 'touch', { x: rect.left + rect.width / 2, y: rect.bottom });
        }
      } else if (!trigger) {
        hideTooltip();
      }
    });

    document.addEventListener('focusin', (event) => {
      if (Date.now() - lastTouchAt < 500) return;
      const trigger = findTrigger(event.target);
      if (trigger) showTooltip(trigger, 'focus');
    });

    document.addEventListener('focusout', (event) => {
      if (activeMode !== 'focus') return;
      const trigger = findTrigger(event.target);
      if (trigger === activeTrigger && (!event.relatedTarget || !trigger.contains(event.relatedTarget))) {
        hideTooltip();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hideTooltip();
    });

    window.addEventListener('resize', () => {
      if (activeTrigger) positionPopup(activeTrigger, activeMode === 'pointer' || activeMode === 'touch' ? lastPointer : null);
    });

    window.addEventListener('scroll', () => {
      if (activeTrigger && activeMode === 'focus') positionPopup(activeTrigger, null);
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
