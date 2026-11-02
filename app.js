/**
 * ChronoShift — Time + Days, Hours & Subsequent Multi-Step Calculator
 * Supports chained additions (e.g. Live Time + 5h 10m + 1d 5h),
 * natural chained syntax, persistent history, and live countdowns.
 */

(function () {
  'use strict';

  // ==========================================
  // CONFIGURATION & AUDIO SYNTHESIS
  // ==========================================
  const STORAGE_KEYS = {
    HISTORY: 'chronoshift_history_v2',
    SETTINGS: 'chronoshift_settings_v2'
  };

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playClick() {
      if (!this.enabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.04);
      } catch (e) {
        // audio error ignored
      }
    }

    playChime() {
      if (!this.enabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.06, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.28);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.3);
        });
      } catch (e) {
        // audio error ignored
      }
    }

    playAlarm() {
      if (!this.enabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        for (let i = 0; i < 3; i++) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(880, now + i * 0.15);
          gain.gain.setValueAtTime(0.08, now + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.1);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + i * 0.15);
          osc.stop(now + i * 0.15 + 0.12);
        }
      } catch (e) {
        // audio error ignored
      }
    }
  }

  const sound = new SoundEngine();

  // ==========================================
  // APPLICATION STATE
  // ==========================================
  let nextStepId = 1;

  const state = {
    timeFormat: '12', // '12' or '24'
    timeSource: 'now', // 'now' or 'custom'
    customDateTime: new Date(),
    steps: [
      { id: nextStepId++, direction: 'add', days: 0, hours: 5, minutes: 10 }
    ],
    history: [],
    historyFilter: 'all', // 'all' or 'starred'
    historySearch: '',
    activeTimer: null,
    targetDate: new Date(),
    stepMilestones: []
  };

  // ==========================================
  // DOM REFERENCES
  // ==========================================
  const dom = {
    // Top bar & Settings
    btnFormat12: document.getElementById('btnFormat12'),
    btnFormat24: document.getElementById('btnFormat24'),
    btnAudioToggle: document.getElementById('btnAudioToggle'),
    iconSoundOn: document.querySelector('.icon-sound-on'),
    iconSoundOff: document.querySelector('.icon-sound-off'),
    historyCountBadge: document.getElementById('historyCount'),

    // Live Anchor Banner
    liveClockDisplay: document.getElementById('liveClockDisplay'),
    liveDateDisplay: document.getElementById('liveDateDisplay'),
    sourceNow: document.getElementById('sourceNow'),
    sourceCustom: document.getElementById('sourceCustom'),
    customPickerWrapper: document.getElementById('customTimePickerWrapper'),
    customDatePicker: document.getElementById('customDatePicker'),
    customTimePicker: document.getElementById('customTimePicker'),
    btnResetToNow: document.getElementById('btnResetToNow'),

    // Steps Container
    stepsContainer: document.getElementById('stepsContainer'),
    btnAddStep: document.getElementById('btnAddStep'),
    inputSmart: document.getElementById('inputSmart'),
    btnClearSmart: document.getElementById('btnClearSmart'),
    presetChips: document.querySelectorAll('.preset-chips .chip-preset'),
    inputCalculationLabel: document.getElementById('inputCalculationLabel'),

    // Results Showcase
    mainResultCard: document.getElementById('mainResultCard'),
    resultStatusBadge: document.getElementById('resultStatusBadge'),
    resultRelativeTag: document.getElementById('resultRelativeTag'),
    resultTimeDisplay: document.getElementById('resultTimeDisplay'),
    resultDateDisplay: document.getElementById('resultDateDisplay'),
    metaTotalOffsetValue: document.getElementById('metaTotalOffsetValue'),
    metaDayValue: document.getElementById('metaDayValue'),
    metaRelativeDayValue: document.getElementById('metaRelativeDayValue'),
    metaStepsCount: document.getElementById('metaStepsCount'),
    timelineBox: document.getElementById('timelineBox'),
    timelineSteps: document.getElementById('timelineSteps'),
    nightAlertBanner: document.getElementById('nightAlertBanner'),
    btnCopyResult: document.getElementById('btnCopyResult'),
    btnSaveHistory: document.getElementById('btnSaveHistory'),
    btnStartCountdown: document.getElementById('btnStartCountdown'),

    // Active Timer Card
    activeTimerCard: document.getElementById('activeTimerCard'),
    timerDigits: document.getElementById('timerDigits'),
    timerTargetDesc: document.getElementById('timerTargetDesc'),
    timerProgressBar: document.getElementById('timerProgressBar'),
    btnCancelTimer: document.getElementById('btnCancelTimer'),

    // History Section
    historyList: document.getElementById('historyList'),
    countAll: document.getElementById('countAll'),
    countStarred: document.getElementById('countStarred'),
    filterButtons: document.querySelectorAll('.filter-pills .btn-filter'),
    inputSearchHistory: document.getElementById('inputSearchHistory'),
    btnExportHistory: document.getElementById('btnExportHistory'),
    btnClearHistory: document.getElementById('btnClearHistory'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  // ==========================================
  // UTILITY HELPERS
  // ==========================================
  function padZero(num, length = 2) {
    return String(num).padStart(length, '0');
  }

  function formatTime(date, format24 = false, includeSeconds = false) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return '--:--';
    let hours = date.getHours();
    const minutes = padZero(date.getMinutes());
    const seconds = padZero(date.getSeconds());

    if (format24) {
      return includeSeconds 
        ? `${padZero(hours)}:${minutes}:${seconds}`
        : `${padZero(hours)}:${minutes}`;
    }

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return includeSeconds
      ? `${hours}:${minutes}:${seconds} ${ampm}`
      : `${hours}:${minutes} ${ampm}`;
  }

  function formatDateFull(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return '--';
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    return date.toLocaleDateString(undefined, options);
  }

  function getDayName(date) {
    return date.toLocaleDateString(undefined, { weekday: 'long' });
  }

  function getRelativeDayString(targetDate, baseDate) {
    const t = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const b = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    const diffDays = Math.round((t - b) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === 2) return 'In 2 days';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays === -2) return '2 days ago';
    if (diffDays > 2) return `In ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  }

  function formatOffsetString(days, hours, minutes, direction = 'add') {
    const sign = direction === 'add' ? '+' : '−';
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || (days === 0 && minutes === 0)) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return `${sign}${parts.join(' ')}`;
  }

  function formatDurationVerbose(totalMins) {
    const absMins = Math.abs(totalMins);
    const d = Math.floor(absMins / 1440);
    const h = Math.floor((absMins % 1440) / 60);
    const m = absMins % 60;
    const parts = [];
    if (d > 0) parts.push(`${d} day${d > 1 ? 's' : ''}`);
    if (h > 0) parts.push(`${h} hr${h > 1 ? 's' : ''}`);
    if (m > 0 || parts.length === 0) parts.push(`${m} min${m > 1 ? 's' : ''}`);
    return parts.join(', ');
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'info' ? 'toast-info' : ''}`;
    toast.innerHTML = `
      <span class="toast-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${type === 'info' 
            ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
            : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'}
        </svg>
      </span>
      <span>${message}</span>
    `;
    dom.toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ==========================================
  // STORAGE & PREFERENCES
  // ==========================================
  function loadStoredData() {
    try {
      const storedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (storedHistory) {
        state.history = JSON.parse(storedHistory);
      }
      const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        if (parsed.timeFormat) state.timeFormat = parsed.timeFormat;
        if (parsed.audioEnabled !== undefined) {
          sound.enabled = parsed.audioEnabled;
          updateAudioIcon();
        }
      }
    } catch (e) {
      console.warn('Storage read error', e);
    }
  }

  function saveStoredHistory() {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(state.history));
      renderHistoryList();
    } catch (e) {
      console.error('Storage write error', e);
    }
  }

  function saveStoredSettings() {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
        timeFormat: state.timeFormat,
        audioEnabled: sound.enabled
      }));
    } catch (e) {
      console.warn('Settings write error', e);
    }
  }

  function updateAudioIcon() {
    if (sound.enabled) {
      dom.iconSoundOn.style.display = 'block';
      dom.iconSoundOff.style.display = 'none';
    } else {
      dom.iconSoundOn.style.display = 'none';
      dom.iconSoundOff.style.display = 'block';
    }
  }

  // ==========================================
  // CLOCK SYNCHRONIZATION
  // ==========================================
  function updateLiveClock() {
    const now = new Date();
    const is24 = state.timeFormat === '24';
    dom.liveClockDisplay.textContent = formatTime(now, is24, true);
    dom.liveDateDisplay.textContent = `${now.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })} • ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;

    // If source is 'now', continuously update live base
    if (state.timeSource === 'now') {
      calculateChainedOffsets();
    }

    // Active countdown tick
    if (state.activeTimer) {
      updateActiveCountdown();
    }
  }

  function getBaseDate() {
    if (state.timeSource === 'now') {
      return new Date();
    }
    return new Date(state.customDateTime);
  }

  // ==========================================
  // MULTI-STEP CALCULATION ENGINE
  // ==========================================
  function calculateChainedOffsets() {
    const base = getBaseDate();
    let currentMs = base.getTime();
    state.stepMilestones = [];

    let netMinutes = 0;

    state.steps.forEach((step, idx) => {
      const stepTotalMins = (step.days * 1440) + (step.hours * 60) + step.minutes;
      const sign = step.direction === 'add' ? 1 : -1;
      const stepDeltaMs = sign * stepTotalMins * 60 * 1000;
      currentMs += stepDeltaMs;
      netMinutes += (sign * stepTotalMins);

      state.stepMilestones.push({
        stepIndex: idx + 1,
        stepOffsetDesc: formatOffsetString(step.days, step.hours, step.minutes, step.direction),
        targetDate: new Date(currentMs)
      });
    });

    const finalTargetDate = new Date(currentMs);
    state.targetDate = finalTargetDate;

    // Display formatted time & date
    const is24 = state.timeFormat === '24';
    dom.resultTimeDisplay.textContent = formatTime(finalTargetDate, is24, false);
    dom.resultDateDisplay.textContent = formatDateFull(finalTargetDate);

    // Status badges & text
    const isNetFuture = netMinutes >= 0;
    if (isNetFuture) {
      dom.resultStatusBadge.textContent = 'FUTURE TARGET';
      dom.resultStatusBadge.classList.remove('subtracted');
      dom.resultRelativeTag.textContent = `in ${formatDurationVerbose(netMinutes)}`;
    } else {
      dom.resultStatusBadge.textContent = 'PAST TARGET';
      dom.resultStatusBadge.classList.add('subtracted');
      dom.resultRelativeTag.textContent = `${formatDurationVerbose(netMinutes)} ago`;
    }

    // Total Offset Meta
    const absNetMins = Math.abs(netMinutes);
    const totDays = Math.floor(absNetMins / 1440);
    const totHours = Math.floor((absNetMins % 1440) / 60);
    const totMins = absNetMins % 60;
    const netSign = netMinutes >= 0 ? '+' : '−';
    
    let totalOffsetStr = `${netSign}`;
    if (totDays > 0) totalOffsetStr += `${totDays}d `;
    totalOffsetStr += `${totHours}h ${totMins}m`;

    dom.metaTotalOffsetValue.textContent = totalOffsetStr;
    dom.metaDayValue.textContent = getDayName(finalTargetDate);
    dom.metaRelativeDayValue.textContent = getRelativeDayString(finalTargetDate, base);
    dom.metaStepsCount.textContent = `${state.steps.length} ${state.steps.length === 1 ? 'offset' : 'subsequent offsets'}`;

    // Nighttime alert (11:00 PM to 6:00 AM)
    const targetHour = finalTargetDate.getHours();
    if (targetHour >= 23 || targetHour < 6) {
      dom.nightAlertBanner.style.display = 'flex';
    } else {
      dom.nightAlertBanner.style.display = 'none';
    }

    // Render Timeline if more than 1 step
    if (state.steps.length > 1) {
      dom.timelineBox.style.display = 'block';
      dom.timelineSteps.innerHTML = state.stepMilestones.map((m, i) => {
        const isSub = m.stepOffsetDesc.includes('−');
        const formattedCheckTime = formatTime(m.targetDate, is24);
        const relDay = getRelativeDayString(m.targetDate, base);
        return `
          <div class="timeline-step-row">
            <span class="timeline-step-label">Step ${m.stepIndex}</span>
            <span class="timeline-step-offset ${isSub ? 'sub' : 'add'}">${m.stepOffsetDesc}</span>
            <span class="timeline-step-time">➔ ${formattedCheckTime} <span style="font-size:0.75rem; color:var(--text-dim);">(${relDay})</span></span>
          </div>
        `;
      }).join('');
    } else {
      dom.timelineBox.style.display = 'none';
    }
  }

  function triggerResultPulse() {
    dom.resultTimeDisplay.classList.remove('pulse');
    void dom.resultTimeDisplay.offsetWidth; // force reflow
    dom.resultTimeDisplay.classList.add('pulse');
  }

  // ==========================================
  // DYNAMIC STEPS UI RENDERING
  // ==========================================
  function renderSteps() {
    dom.stepsContainer.innerHTML = state.steps.map((step, idx) => {
      const isSub = step.direction === 'sub';
      const canRemove = state.steps.length > 1;

      return `
        <div class="step-card" data-step-id="${step.id}">
          <div class="step-header">
            <div class="step-badge-group">
              <span class="step-badge">${idx === 0 ? 'START OFFSET' : `+ SUBSEQUENT #${idx + 1}`}</span>
              <div class="step-direction-switch">
                <button type="button" class="btn-step-dir ${!isSub ? 'active' : ''}" data-dir="add" data-step-id="${step.id}">+ Add</button>
                <button type="button" class="btn-step-dir ${isSub ? 'active' : ''}" data-dir="sub" data-step-id="${step.id}">− Subtract</button>
              </div>
            </div>
            ${canRemove ? `
              <button type="button" class="btn-remove-step" data-action="remove-step" data-step-id="${step.id}" title="Remove this offset">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Remove
              </button>
            ` : ''}
          </div>

          <div class="steppers-row">
            <!-- DAYS -->
            <div class="stepper-box">
              <div class="stepper-header">
                <label for="step_days_${step.id}">DAYS</label>
                <span class="unit-badge">days</span>
              </div>
              <div class="stepper-control">
                <button type="button" class="step-btn" data-step-action="minus-day" data-step-id="${step.id}" aria-label="Decrease days">−</button>
                <input type="number" id="step_days_${step.id}" name="days_${step.id}" min="0" max="9999" value="${step.days}" class="step-input" data-field="days" data-step-id="${step.id}" aria-label="Step ${idx + 1} Days" />
                <button type="button" class="step-btn" data-step-action="plus-day" data-step-id="${step.id}" aria-label="Increase days">+</button>
              </div>
            </div>

            <!-- HOURS -->
            <div class="stepper-box">
              <div class="stepper-header">
                <label for="step_hours_${step.id}">HOURS</label>
                <span class="unit-badge">hrs</span>
              </div>
              <div class="stepper-control">
                <button type="button" class="step-btn" data-step-action="minus-hour" data-step-id="${step.id}" aria-label="Decrease hours">−</button>
                <input type="number" id="step_hours_${step.id}" name="hours_${step.id}" min="0" max="9999" value="${step.hours}" class="step-input" data-field="hours" data-step-id="${step.id}" aria-label="Step ${idx + 1} Hours" />
                <button type="button" class="step-btn" data-step-action="plus-hour" data-step-id="${step.id}" aria-label="Increase hours">+</button>
              </div>
            </div>

            <!-- MINUTES -->
            <div class="stepper-box">
              <div class="stepper-header">
                <label for="step_mins_${step.id}">MINUTES</label>
                <span class="unit-badge">min</span>
              </div>
              <div class="stepper-control">
                <button type="button" class="step-btn" data-step-action="minus-min" data-step-id="${step.id}" aria-label="Decrease minutes">−5</button>
                <input type="number" id="step_mins_${step.id}" name="minutes_${step.id}" min="0" max="59" value="${step.minutes}" class="step-input" data-field="minutes" data-step-id="${step.id}" aria-label="Step ${idx + 1} Minutes" />
                <button type="button" class="step-btn" data-step-action="plus-min" data-step-id="${step.id}" aria-label="Increase minutes">+5</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    calculateChainedOffsets();
  }

  function addSubsequentStep(days = 0, hours = 1, minutes = 0, direction = 'add') {
    sound.playClick();
    state.steps.push({
      id: nextStepId++,
      direction,
      days,
      hours,
      minutes
    });
    renderSteps();
    triggerResultPulse();
    showToast(`Added subsequent offset #${state.steps.length}!`);
  }

  function removeStep(stepId) {
    if (state.steps.length <= 1) return;
    sound.playClick();
    state.steps = state.steps.filter(s => s.id !== stepId);
    renderSteps();
    triggerResultPulse();
    showToast('Removed offset step', 'info');
  }

  // ==========================================
  // SMART NATURAL PARSER (MULTI-EXPRESSIONS)
  // Supports chained syntax like:
  // "5h 10m + 1d 5h" or "2d 4h" or "5hours10min + 1day5hrs"
  // ==========================================
  function parseSmartChainedInput(inputStr) {
    const raw = inputStr.trim();
    if (!raw) return;

    // Split by subsequent '+' or 'then' or ',' (preserving signs)
    const segments = raw.split(/\s*(?:\+|\bthen\b|,)\s*/i).filter(Boolean);
    if (segments.length === 0) return;

    const parsedSteps = [];

    for (const seg of segments) {
      let isSub = false;
      let cleanSeg = seg.trim();

      if (cleanSeg.startsWith('-') || cleanSeg.startsWith('−')) {
        isSub = true;
        cleanSeg = cleanSeg.substring(1).trim();
      }

      let d = 0;
      let h = 0;
      let m = 0;

      // Extract days: e.g. "1d", "2 days", "1.5d"
      const dayMatch = cleanSeg.match(/(\d+(?:\.\d+)?)\s*(?:d|day|days)/i);
      if (dayMatch) {
        const decDays = parseFloat(dayMatch[1]);
        d = Math.floor(decDays);
        const remH = (decDays - d) * 24;
        h += Math.floor(remH);
        m += Math.round((remH - Math.floor(remH)) * 60);
      }

      // Extract hours: e.g. "5h", "5 hours", "5hrs", "2.5h"
      const hourMatch = cleanSeg.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)/i);
      if (hourMatch) {
        const decHours = parseFloat(hourMatch[1]);
        const fullH = Math.floor(decHours);
        h += fullH;
        m += Math.round((decHours - fullH) * 60);
      }

      // Extract minutes: e.g. "10m", "10 min", "10mins", "10minutes"
      const minMatch = cleanSeg.match(/(\d+)\s*(?:m|min|mins|minutes?)/i);
      if (minMatch) {
        m += parseInt(minMatch[1], 10);
      }

      // Fallback: If just a naked decimal number like "2.5"
      if (!dayMatch && !hourMatch && !minMatch) {
        const pureNum = parseFloat(cleanSeg);
        if (!isNaN(pureNum)) {
          h = Math.floor(pureNum);
          m = Math.round((pureNum - h) * 60);
        }
      }

      // Balance minutes into hours and days
      if (m >= 60) {
        h += Math.floor(m / 60);
        m = m % 60;
      }
      if (h >= 24) {
        d += Math.floor(h / 24);
        h = h % 24;
      }

      if (d > 0 || h > 0 || m > 0) {
        parsedSteps.push({
          id: nextStepId++,
          direction: isSub ? 'sub' : 'add',
          days: d,
          hours: h,
          minutes: m
        });
      }
    }

    if (parsedSteps.length > 0) {
      state.steps = parsedSteps;
      renderSteps();
      triggerResultPulse();
      sound.playClick();
    }
  }

  // ==========================================
  // LIVE COUNTDOWN WIDGET
  // ==========================================
  function startLiveCountdown() {
    sound.playClick();
    const target = state.targetDate;
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();

    if (diffMs <= 0) {
      showToast('Target time is in the past! Set a future time.', 'info');
      return;
    }

    state.activeTimer = {
      startTime: now.getTime(),
      targetTime: target.getTime(),
      totalDurationMs: diffMs,
      label: dom.inputCalculationLabel.value.trim() || 'Calculated Target'
    };

    dom.activeTimerCard.style.display = 'block';
    dom.timerTargetDesc.textContent = `Target: ${formatTime(target, state.timeFormat === '24')} (${state.activeTimer.label})`;
    updateActiveCountdown();
    showToast('Live countdown timer started! ⏱️');
  }

  function updateActiveCountdown() {
    if (!state.activeTimer) return;
    const now = Date.now();
    const remainingMs = state.activeTimer.targetTime - now;

    if (remainingMs <= 0) {
      dom.timerDigits.textContent = '00:00:00';
      dom.timerProgressBar.style.width = '0%';
      sound.playAlarm();
      showToast(`⏰ Time reached: ${state.activeTimer.label}`);
      state.activeTimer = null;
      setTimeout(() => {
        if (!state.activeTimer) dom.activeTimerCard.style.display = 'none';
      }, 5000);
      return;
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hrs = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    let timeStr = `${padZero(hrs)}:${padZero(mins)}:${padZero(secs)}`;
    if (days > 0) timeStr = `${days}d ` + timeStr;
    dom.timerDigits.textContent = timeStr;

    const progressPct = Math.max(0, Math.min(100, (remainingMs / state.activeTimer.totalDurationMs) * 100));
    dom.timerProgressBar.style.width = `${progressPct}%`;
  }

  function cancelActiveCountdown() {
    sound.playClick();
    state.activeTimer = null;
    dom.activeTimerCard.style.display = 'none';
    showToast('Countdown stopped', 'info');
  }

  // ==========================================
  // HISTORY MANAGEMENT
  // ==========================================
  function saveCurrentCalculationToHistory() {
    sound.playChime();
    const base = getBaseDate();
    const is24 = state.timeFormat === '24';
    const labelVal = dom.inputCalculationLabel.value.trim();

    // Build chain description: e.g. "+5h 10m then +1d 5h"
    const offsetParts = state.steps.map(s => formatOffsetString(s.days, s.hours, s.minutes, s.direction));
    const offsetDesc = offsetParts.join(' then ');

    const entry = {
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      recordedAt: new Date().toISOString(),
      label: labelVal || (state.steps.length > 1 ? `Chained (${state.steps.length} steps)` : offsetDesc),
      startDesc: `${state.timeSource === 'now' ? 'Live ' : ''}${formatTime(base, is24)}`,
      offsetDesc: offsetDesc,
      targetTimeDesc: formatTime(state.targetDate, is24),
      targetDateDesc: `${getDayName(state.targetDate)}, ${state.targetDate.toLocaleDateString()}`,
      isStarred: false,
      rawSteps: JSON.parse(JSON.stringify(state.steps)),
      timeSource: state.timeSource,
      baseIso: base.toISOString()
    };

    state.history.unshift(entry);
    if (state.history.length > 200) {
      state.history = state.history.slice(0, 200);
    }

    saveStoredHistory();
    showToast('Saved to calculation history!');
  }

  function toggleStarHistory(id) {
    sound.playClick();
    const item = state.history.find(h => h.id === id);
    if (item) {
      item.isStarred = !item.isStarred;
      saveStoredHistory();
    }
  }

  function deleteHistoryItem(id) {
    sound.playClick();
    state.history = state.history.filter(h => h.id !== id);
    saveStoredHistory();
    showToast('Entry removed from history', 'info');
  }

  function reloadHistoryItem(id) {
    const item = state.history.find(h => h.id === id);
    if (!item || !item.rawSteps) return;
    sound.playClick();

    state.steps = JSON.parse(JSON.stringify(item.rawSteps));
    // Ensure ids are present
    state.steps.forEach(s => { s.id = nextStepId++; });
    dom.inputCalculationLabel.value = item.label || '';

    renderSteps();
    triggerResultPulse();
    showToast(`Restored: ${item.offsetDesc}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function copyHistoryItem(item) {
    sound.playClick();
    const text = `${item.label ? `[${item.label}] ` : ''}Base: ${item.startDesc} | Offset: ${item.offsetDesc} ➔ Result: ${item.targetTimeDesc} on ${item.targetDateDesc}`;
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard! 📋');
    });
  }

  function renderHistoryList() {
    const countTotal = state.history.length;
    const countStarred = state.history.filter(h => h.isStarred).length;

    dom.historyCountBadge.textContent = countTotal;
    dom.countAll.textContent = countTotal;
    dom.countStarred.textContent = countStarred;

    const query = state.historySearch.toLowerCase().trim();
    let filtered = state.history;

    if (state.historyFilter === 'starred') {
      filtered = filtered.filter(h => h.isStarred);
    }

    if (query) {
      filtered = filtered.filter(h => 
        (h.label && h.label.toLowerCase().includes(query)) ||
        (h.offsetDesc && h.offsetDesc.toLowerCase().includes(query)) ||
        (h.targetTimeDesc && h.targetTimeDesc.toLowerCase().includes(query))
      );
    }

    if (filtered.length === 0) {
      dom.historyList.innerHTML = `
        <div class="empty-history-state">
          <div class="empty-history-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <p>${state.history.length === 0 ? 'No calculations saved yet. Perform a calculation and click "Save to History".' : 'No calculations match your search criteria.'}</p>
        </div>
      `;
      return;
    }

    dom.historyList.innerHTML = filtered.map(item => {
      const isSub = item.offsetDesc.includes('−') || item.offsetDesc.includes('-');
      const recordDate = new Date(item.recordedAt);
      const timeAgo = formatTimeAgo(recordDate);

      return `
        <div class="history-item" data-id="${item.id}">
          <button type="button" class="history-star-btn ${item.isStarred ? 'starred' : ''}" title="${item.isStarred ? 'Unstar' : 'Star'}" data-action="star">
            ★
          </button>
          
          <div class="history-main-info" data-action="reload" style="cursor: pointer;">
            <div class="history-top-row">
              ${item.label ? `<span class="history-label-tag">${escapeHtml(item.label)}</span>` : ''}
              <span class="history-offset-pill ${isSub ? 'sub' : 'add'}">${item.offsetDesc}</span>
              <span class="history-time-eq">from ${item.startDesc}</span>
            </div>
            <div class="history-bottom-row">
              <span class="history-target-time">${item.targetTimeDesc}</span>
              <span class="history-target-date">${item.targetDateDesc}</span>
              <span class="history-recorded-at">${timeAgo}</span>
            </div>
          </div>

          <div class="history-item-actions">
            <button type="button" class="history-action-btn" title="Restore this calculation" data-action="reload">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            </button>
            <button type="button" class="history-action-btn" title="Copy calculation" data-action="copy">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button type="button" class="history-action-btn btn-trash" title="Delete entry" data-action="delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m]));
  }

  function formatTimeAgo(date) {
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  }

  function exportHistory() {
    if (state.history.length === 0) {
      showToast('No history to export!', 'info');
      return;
    }
    sound.playClick();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.history, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `chronoshift_history_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast('Exported history as JSON file! 💾');
  }

  function clearAllHistory() {
    if (state.history.length === 0) return;
    if (confirm('Are you sure you want to clear your entire calculation history? This cannot be undone.')) {
      state.history = [];
      saveStoredHistory();
      showToast('All history cleared', 'info');
    }
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================
  function setupEventListeners() {
    // 12h / 24h toggle
    dom.btnFormat12.addEventListener('click', () => {
      sound.playClick();
      state.timeFormat = '12';
      dom.btnFormat12.classList.add('active');
      dom.btnFormat24.classList.remove('active');
      saveStoredSettings();
      calculateChainedOffsets();
      renderHistoryList();
    });

    dom.btnFormat24.addEventListener('click', () => {
      sound.playClick();
      state.timeFormat = '24';
      dom.btnFormat24.classList.add('active');
      dom.btnFormat12.classList.remove('active');
      saveStoredSettings();
      calculateChainedOffsets();
      renderHistoryList();
    });

    // Audio toggle
    dom.btnAudioToggle.addEventListener('click', () => {
      sound.enabled = !sound.enabled;
      updateAudioIcon();
      saveStoredSettings();
      if (sound.enabled) sound.playClick();
      showToast(sound.enabled ? 'Audio feedback enabled' : 'Audio feedback muted', 'info');
    });

    // Time Source Radio (Live vs Custom)
    dom.sourceNow.addEventListener('change', () => {
      sound.playClick();
      state.timeSource = 'now';
      dom.customPickerWrapper.style.display = 'none';
      calculateChainedOffsets();
      triggerResultPulse();
    });

    dom.sourceCustom.addEventListener('change', () => {
      sound.playClick();
      state.timeSource = 'custom';
      dom.customPickerWrapper.style.display = 'block';
      const now = new Date();
      dom.customDatePicker.value = `${now.getFullYear()}-${padZero(now.getMonth() + 1)}-${padZero(now.getDate())}`;
      dom.customTimePicker.value = `${padZero(now.getHours())}:${padZero(now.getMinutes())}`;
      updateCustomAnchor();
      calculateChainedOffsets();
      triggerResultPulse();
    });

    function updateCustomAnchor() {
      const d = dom.customDatePicker.value;
      const t = dom.customTimePicker.value;
      if (d && t) {
        state.customDateTime = new Date(`${d}T${t}`);
        calculateChainedOffsets();
        triggerResultPulse();
      }
    }

    dom.customDatePicker.addEventListener('change', updateCustomAnchor);
    dom.customTimePicker.addEventListener('change', updateCustomAnchor);

    dom.btnResetToNow.addEventListener('click', () => {
      sound.playClick();
      const now = new Date();
      dom.customDatePicker.value = `${now.getFullYear()}-${padZero(now.getMonth() + 1)}-${padZero(now.getDate())}`;
      dom.customTimePicker.value = `${padZero(now.getHours())}:${padZero(now.getMinutes())}`;
      updateCustomAnchor();
    });

    // Add Step Button
    dom.btnAddStep.addEventListener('click', () => {
      addSubsequentStep(1, 5, 0, 'add'); // defaults to +1d 5h for convenience
    });

    // Delegated Step controls (Directions, Steppers, Inputs, Remove)
    dom.stepsContainer.addEventListener('click', (e) => {
      const dirBtn = e.target.closest('.btn-step-dir');
      if (dirBtn) {
        sound.playClick();
        const stepId = parseInt(dirBtn.dataset.stepId, 10);
        const step = state.steps.find(s => s.id === stepId);
        if (step) {
          step.direction = dirBtn.dataset.dir;
          renderSteps();
          triggerResultPulse();
        }
        return;
      }

      const removeBtn = e.target.closest('[data-action="remove-step"]');
      if (removeBtn) {
        const stepId = parseInt(removeBtn.dataset.stepId, 10);
        removeStep(stepId);
        return;
      }

      const stepActionBtn = e.target.closest('[data-step-action]');
      if (stepActionBtn) {
        sound.playClick();
        const action = stepActionBtn.dataset.stepAction;
        const stepId = parseInt(stepActionBtn.dataset.stepId, 10);
        const step = state.steps.find(s => s.id === stepId);
        if (!step) return;

        if (action === 'minus-day') step.days = Math.max(0, step.days - 1);
        if (action === 'plus-day') step.days += 1;
        if (action === 'minus-hour') step.hours = Math.max(0, step.hours - 1);
        if (action === 'plus-hour') step.hours += 1;
        if (action === 'minus-min') {
          step.minutes = Math.max(0, step.minutes - 5);
        }
        if (action === 'plus-min') {
          step.minutes += 5;
          if (step.minutes >= 60) {
            step.hours += Math.floor(step.minutes / 60);
            step.minutes = step.minutes % 60;
          }
        }

        renderSteps();
        triggerResultPulse();
      }
    });

    // Stepper inputs change
    dom.stepsContainer.addEventListener('input', (e) => {
      const input = e.target.closest('.step-input');
      if (!input) return;
      const stepId = parseInt(input.dataset.stepId, 10);
      const field = input.dataset.field;
      const val = parseInt(input.value, 10);
      const step = state.steps.find(s => s.id === stepId);
      if (step && field) {
        step[field] = isNaN(val) ? 0 : Math.max(0, val);
        calculateChainedOffsets();
      }
    });

    // Preset Chips
    dom.presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        sound.playClick();
        const d = parseInt(chip.dataset.days, 10) || 0;
        const h = parseInt(chip.dataset.hours, 10) || 0;
        const m = parseInt(chip.dataset.mins, 10) || 0;

        // Apply to the active / last step
        const targetStep = state.steps[state.steps.length - 1];
        if (targetStep) {
          targetStep.days = d;
          targetStep.hours = h;
          targetStep.minutes = m;
          renderSteps();
          triggerResultPulse();
          showToast(`Applied preset to offset #${state.steps.length}`);
        }
      });
    });

    // Smart input expression
    dom.inputSmart.addEventListener('input', (e) => {
      parseSmartChainedInput(e.target.value);
    });

    dom.btnClearSmart.addEventListener('click', () => {
      dom.inputSmart.value = '';
    });

    // Action buttons
    dom.btnCopyResult.addEventListener('click', () => {
      sound.playChime();
      const is24 = state.timeFormat === '24';
      const timeStr = formatTime(state.targetDate, is24);
      const dateStr = formatDateFull(state.targetDate);
      const offsetDesc = state.steps.map(s => formatOffsetString(s.days, s.hours, s.minutes, s.direction)).join(' then ');
      const clipText = `${timeStr} (${dateStr}) [${offsetDesc}]`;

      navigator.clipboard.writeText(clipText).then(() => {
        showToast('Target time copied to clipboard! 📋');
      });
    });

    dom.btnSaveHistory.addEventListener('click', saveCurrentCalculationToHistory);

    dom.btnStartCountdown.addEventListener('click', startLiveCountdown);
    dom.btnCancelTimer.addEventListener('click', cancelActiveCountdown);

    // History interaction delegation
    dom.historyList.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      const itemEl = target.closest('.history-item');
      if (!itemEl) return;
      const id = itemEl.dataset.id;

      if (action === 'star') {
        toggleStarHistory(id);
      } else if (action === 'delete') {
        deleteHistoryItem(id);
      } else if (action === 'reload') {
        reloadHistoryItem(id);
      } else if (action === 'copy') {
        const item = state.history.find(h => h.id === id);
        if (item) copyHistoryItem(item);
      }
    });

    // Filter pills (All vs Starred)
    dom.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        dom.filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.historyFilter = btn.dataset.filter;
        renderHistoryList();
      });
    });

    // History search
    dom.inputSearchHistory.addEventListener('input', (e) => {
      state.historySearch = e.target.value;
      renderHistoryList();
    });

    // Export & Clear history
    dom.btnExportHistory.addEventListener('click', exportHistory);
    dom.btnClearHistory.addEventListener('click', clearAllHistory);

    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      const isInput = tag === 'input' || tag === 'textarea';

      if (e.key === 'Enter' && (!isInput || document.activeElement === dom.inputCalculationLabel)) {
        saveCurrentCalculationToHistory();
      } else if (e.key === 'Escape') {
        state.steps = [{ id: nextStepId++, direction: 'add', days: 0, hours: 0, minutes: 0 }];
        dom.inputSmart.value = '';
        dom.inputCalculationLabel.value = '';
        renderSteps();
        showToast('Calculator reset', 'info');
      }
    });
  }

  // ==========================================
  // INITIALIZATION ON LOAD
  // ==========================================
  function init() {
    loadStoredData();

    // Sync button formats
    if (state.timeFormat === '24') {
      dom.btnFormat24.classList.add('active');
      dom.btnFormat12.classList.remove('active');
    } else {
      dom.btnFormat12.classList.add('active');
      dom.btnFormat24.classList.remove('active');
    }

    setupEventListeners();
    renderSteps();
    updateLiveClock();
    renderHistoryList();

    // Start live clock ticking
    setInterval(updateLiveClock, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
