(function () {
  'use strict';

  function getRoomElement(roomName) {
    return document.querySelector(`.room[data-room-name="${roomName.replace(/"/g, '\\"')}"]`);
  }

  window.statusCardsConfig = {};
  window.enabledCards = [];

  async function loadBaseTopic() {
    try {
      const resp = await fetch('/config.json');
      if (!resp.ok) throw new Error('Failed to load config');
      const config = await resp.json();
      window.baseTopic = config.mosquitto?.base_topic || 'zigbee2mqtt';
      console.log('🦆 Base topic:', window.baseTopic);
    } catch (e) {
      console.warn('Could not load config, using default', e);
      window.baseTopic = 'zigbee2mqtt';
    }
  }

  async function loadCardConfig() {
    try {
      const resp = await fetch('/status-cards-config.json');
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const config = await resp.json();
      window.statusCardsConfig = config.cards;
      window.enabledCards = config.enabled;
      console.log('🦆 Card config loaded');
    } catch (e) {
      console.error('🦆 Error loading card config:', e);
    }
  }

  function loadChartJS() {
    return new Promise((resolve, reject) => {
      if (typeof Chart !== 'undefined') return resolve();
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function renderEnhancedChart(cardId, historyData, color) {
    const canvas = document.getElementById('status-' + cardId + '-chart');
    if (!canvas) return;
    if (canvas.chartInstance) {
      canvas.chartInstance.destroy();
      canvas.classList.add('fade-out');
      setTimeout(() => canvas.classList.remove('fade-out'), 300);
    }
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, color + '80');
    gradient.addColorStop(0.7, color + '20');
    gradient.addColorStop(1, color + '05');
    const borderGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    borderGradient.addColorStop(0, '#00e5ff');
    borderGradient.addColorStop(0.5, color);
    borderGradient.addColorStop(1, '#ff00ff');
    canvas.chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: historyData.map((_, i) => i),
        datasets: [{
          data: historyData,
          borderColor: borderGradient,
          backgroundColor: gradient,
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: color,
          pointHoverBorderWidth: 3,
          fill: true,
          cubicInterpolationMode: 'monotone'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1000, easing: 'easeOutQuart', onComplete: () => canvas.classList.add('chart-loaded') },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.8)',
            titleColor: '#fff',
            bodyColor: color,
            borderColor: color,
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: false,
            callbacks: { label: (ctx) => cardId + ': ' + ctx.parsed.y.toFixed(2) }
          }
        },
        scales: {
          x: { display: false, grid: { display: false } },
          y: { display: false, grid: { color: 'rgba(255,255,255,0.1)', drawBorder: false } }
        }
      }
    });
    if (cardId === 'temperature') addChartParticles(canvas, historyData, color);
  }

  function addChartParticles(canvas, data, color) {
    const container = document.createElement('div');
    container.className = 'chart-particles';
    container.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    canvas.parentNode.style.position = 'relative';
    canvas.parentNode.appendChild(container);
    for (let i = 0; i < 10; i++) {
      const particle = document.createElement('div');
      particle.className = 'chart-particle';
      particle.style.cssText = `position:absolute;width:4px;height:4px;background:${color};border-radius:50%;opacity:0.6;filter:blur(1px);`;
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 0.6 },
        { transform: `translate(${Math.random()*20-10}px, ${Math.random()*20-10}px) scale(1.5)`, opacity: 0.2 }
      ], { duration: 2000 + Math.random() * 2000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
      container.appendChild(particle);
    }
  }

  function animateNumber(element, start, end, duration) {
    const startTime = performance.now();
    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      element.textContent = (start + (end - start) * eased).toFixed(1);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  function updateCardValueWithAnimation(cardId, value) {
    const el = document.getElementById('status-' + cardId + '-value');
    if (!el) return;
    el.classList.add('value-update');
    const old = parseFloat(el.textContent) || 0;
    const val = parseFloat(value) || 0;
    if (old !== val) animateNumber(el, old, val, 500);
    else el.textContent = value;
    if (cardId === 'temperature') {
      let c;
      if (val < 18) c = '#3498db';
      else if (val < 22) c = '#2ecc71';
      else if (val < 26) c = '#f39c12';
      else c = '#e74c3c';
      el.style.color = c;
      el.style.textShadow = `0 0 20px ${c}, 0 0 40px ${c}40`;
    }
    setTimeout(() => el.classList.remove('value-update'), 500);
  }

  function updateCardDetails(cardId, details) {
    const el = document.getElementById('status-' + cardId + '-details');
    if (el) {
      el.textContent = details;
      el.classList.add('details-update');
      setTimeout(() => el.classList.remove('details-update'), 300);
    }
  }

  function updateCardChart(cardId, historyData, color) {
    const canvas = document.getElementById('status-' + cardId + '-chart');
    if (!canvas) return;
    if (typeof Chart === 'undefined') {
      loadChartJS().then(() => renderEnhancedChart(cardId, historyData, color));
    } else {
      renderEnhancedChart(cardId, historyData, color);
    }
  }

  function updateCard(cardName) {
    const config = window.statusCardsConfig[cardName];
    if (!config) return;
    fetch('/' + config.fileName)
      .then(r => r.json())
      .then(data => {
        const value = data[config.jsonField];
        if (value === undefined) throw new Error('Field ' + config.jsonField + ' missing');
        const formatted = config.format.replace(/\{value\}/g, value);
        updateCardValueWithAnimation(cardName, formatted);
        if (config.detailsJsonField && data[config.detailsJsonField] !== undefined) {
          const dVal = data[config.detailsJsonField];
          updateCardDetails(cardName, config.detailsFormat.replace(/\{value\}/g, dVal));
        } else if (config.details) {
          updateCardDetails(cardName, config.details);
        } else {
          updateCardDetails(cardName, config.defaultDetails);
        }
        if (config.chart && data[config.historyField]) {
          const hist = data[config.historyField];
          if (Array.isArray(hist) && hist.length > 0)
            updateCardChart(cardName, hist, config.color);
        }
      })
      .catch(err => {
        console.error('🦆 updateCard', cardName, err);
        updateCardValueWithAnimation(cardName, config.defaultValue);
        updateCardDetails(cardName, config.defaultDetails);
      });
  }

  function updateAllCards() {
    window.enabledCards.forEach(c => updateCard(c));
  }

  function handleCardClick(cardName) {
    const config = window.statusCardsConfig[cardName];
    if (!config) return;
    const base = window.baseTopic || 'zigbee2mqtt';
    const topic = `${base}/dashboard/card/${cardName}/click`;
    const msg = JSON.stringify({
      action: 'click',
      card: cardName,
      timestamp: new Date().toISOString(),
      config: { hasActions: config.on_click_action && config.on_click_action.length > 0, title: config.title }
    });
    if (window.client && window.client.connected) {
      window.client.publish(topic, msg);
    } else if (typeof showNotification === 'function') {
      showNotification('Not connected', 'error');
    }
  }

  async function initStatusCards() {
    window.enabledCards.forEach(cardName => {
      const cardEl = document.querySelector(`.card[data-card="${cardName}"]`);
      if (cardEl) {
        cardEl.addEventListener('click', () => handleCardClick(cardName));
        cardEl.style.cursor = 'pointer';
      }
    });
    updateAllCards();
    setInterval(updateAllCards, 30000);
  }

  window.updateCard = updateCard;
  window.updateAllCards = updateAllCards;
  window.updateCardValue = updateCardValueWithAnimation;
  window.updateCardDetails = updateCardDetails;
  window.updateCardChart = updateCardChart;
  window.initStatusCards = initStatusCards;

  let currentOpenRoom = null;

  function playTemperatureChangeSound() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ac.currentTime);
      osc.frequency.linearRampToValueAtTime(400, ac.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.2);
      osc.start(); osc.stop(ac.currentTime + 0.2);
    } catch (e) {}
  }

  function playPanelOpenSound() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ac.createOscillator(), gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ac.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.3);
      osc.start(); osc.stop(ac.currentTime + 0.3);
    } catch (e) {}
  }

  function playPanelCloseSound() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ac.createOscillator(), gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ac.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.2);
      osc.start(); osc.stop(ac.currentTime + 0.2);
    } catch (e) {}
  }

  function openRoomDevicesPanel(roomId, roomName) {
    console.log('🦆 Opening devices panel for room:', roomId, roomName);
    currentOpenRoom = roomId;
    document.getElementById('panelRoomName').textContent = roomName.toUpperCase();
    const roomEl = document.getElementById('room-' + roomId);
    const iconClass = roomEl.querySelector('.room-icon').className.match(/mdi-([^ ]+)/)[1];
    document.getElementById('panelRoomIcon').className = 'mdi mdi-' + iconClass + ' panel-room-icon';
    //populateRoomDevices(roomId);
    populateRoomDevices(roomId, roomName);
    document.getElementById('devicesSlidePanel').classList.add('open');
    document.getElementById('panelBackdrop').classList.add('active');
    document.body.style.overflow = 'hidden';
    playPanelOpenSound();
  }

  function closeRoomDevicesPanel() {
    console.log('🦆 Closing devices panel');
    document.getElementById('devicesSlidePanel').classList.remove('open');
    document.getElementById('panelBackdrop').classList.remove('active');
    document.body.style.overflow = '';
    currentOpenRoom = null;
    playPanelCloseSound();
  }

  function populateRoomDevices(roomId, roomName) {
    const container = document.getElementById('panelDevicesContainer');
    container.innerHTML = '';
    const mappings = window.roomDeviceMappings[roomName] || [];
    if (!mappings.length) {
      container.innerHTML = '<div class="no-devices-message"><i class="fas fa-lightbulb" style="font-size:4rem;opacity:0.3;"></i><p>No devices in this room</p></div>';
      return;
    }
    mappings.forEach(info => {
      const id = info.id;
      const friendly = info.friendly_name;
      let dev = window.devices[friendly] || window.devices[id] || {};
      const supportsColor = dev.supports_color || false;
      const supportsTemp = dev.supports_temperature || false;
      const color = dev.color?.hex || '#ffffff';
      const temp = dev.color_temp || 153;
      const isOn = dev.state === 'ON';
      let brightness = dev.brightness || 100;
      if (brightness > 100) brightness = Math.round((brightness / 254) * 100);
      let icon = dev.icon || 'mdi:lightbulb';
      let iconClass = icon.startsWith('mdi:') ? 'mdi mdi-' + icon.substring(4) : (icon.startsWith('fas ') ? icon : 'fas fa-lightbulb');

      const el = document.createElement('div');
      el.className = 'panel-device' + (isOn ? ' on' : '');
      el.dataset.deviceId = id;
      el.style.cursor = 'pointer';
      if (isOn && color) {
        el.style.setProperty('--device-color', color);
        const rgb = hexToRgb(color);
        if (rgb) el.style.setProperty('--device-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      }
      el.innerHTML = `
        <div class="panel-device-header">
          <div class="panel-device-icon-name">
            <i class="${iconClass} panel-device-icon"></i>
            <div class="panel-device-name">${friendly || id}</div>
          </div>
          <label class="panel-device-toggle">
            <input type="checkbox" class="device-toggle-checkbox" ${isOn ? 'checked' : ''}>
            <span class="panel-device-toggle-slider"></span>
          </label>
        </div>
        <div class="panel-device-controls">
          ${supportsColor ? `
          <div class="panel-color-control">
            <input type="color" class="panel-color-picker" value="${color}" ${!isOn ? 'disabled' : ''}>
            <span class="panel-color-label">Color</span>
          </div>` : ''}
          ${supportsTemp ? `
          <div class="panel-temperature-control">
            <div class="panel-temperature-label">
              <span>Temperature</span>
              <span class="panel-temperature-value">${temp} mired</span>
            </div>
            <input type="range" class="panel-temperature-slider" min="153" max="500" value="${temp}" ${!isOn ? 'disabled' : ''}>
          </div>` : ''}
          <div class="panel-brightness-control">
            <div class="panel-brightness-label">
              <span>Brightness</span>
              <span class="panel-brightness-value">${brightness}%</span>
            </div>
            <input type="range" class="panel-brightness-slider" min="0" max="100" value="${brightness}" ${!isOn ? 'disabled' : ''}>
          </div>
        </div>`;

      const toggle = el.querySelector('.device-toggle-checkbox');
      const colorPicker = el.querySelector('.panel-color-picker');
      const tempSlider = el.querySelector('.panel-temperature-slider');
      const brightSlider = el.querySelector('.panel-brightness-slider');

      el.addEventListener('click', function (e) {
        if (e.target.closest('.panel-device-controls') || e.target.closest('.panel-device-toggle')) return;
        closeRoomDevicesPanel();
        const deviceTab = document.querySelector('.nav-tab[data-page="1"]');
        if (deviceTab) {
          deviceTab.click();
          setTimeout(() => {
            const select = document.getElementById('deviceSelect');
            if (select) {
              select.value = id;
              select.dispatchEvent(new Event('change'));
            }
          }, 100);
        }
      });

      toggle.addEventListener('change', function (e) {
        e.stopPropagation();
        setDeviceState(id, this.checked);
      });

      colorPicker?.addEventListener('input', function (e) {
        e.stopPropagation();
        setDeviceColor(id, this.value);
      });

      tempSlider?.addEventListener('input', function (e) {
        e.stopPropagation();
        const val = this.value;
        setDeviceTemperature(id, val);
        this.closest('.panel-temperature-control').querySelector('.panel-temperature-value').textContent = val + ' mired';
      });

      brightSlider?.addEventListener('input', function (e) {
        e.stopPropagation();
        const val = this.value;
        setDeviceBrightness(id, val);
        el.querySelector('.panel-brightness-value').textContent = val + '%';
      });

      container.appendChild(el);
    });
  }

  function setDeviceState(deviceId, state) {
    window.sendCommand?.(deviceId, { state: state ? 'ON' : 'OFF' });
  }

  function setDeviceTemperature(deviceId, mired) {
    window.sendCommand?.(deviceId, { color_temp: parseInt(mired) });
  }

  function hexToRgb(hex) {
    const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return res ? { r: parseInt(res[1], 16), g: parseInt(res[2], 16), b: parseInt(res[3], 16) } : null;
  }

  function updateRoomDevicesInPanel() {
    if (currentOpenRoom) populateRoomDevices(currentOpenRoom);
  }

  window.openRoomDevicesPanel = openRoomDevicesPanel;
  window.closeRoomDevicesPanel = closeRoomDevicesPanel;
  window.updateRoomDevicesInPanel = updateRoomDevicesInPanel;

  function updateRoomStats() {
    console.log('🦆 Updating room stats...');
    if (!window.roomDeviceMappings || !window.devices) return;
    Object.entries(window.roomDeviceMappings).forEach(([room, mappings]) => {
      const el = getRoomElement(room);
      if (!el) return;
      let onCount = 0, totalBri = 0, count = 0;
      mappings.forEach(info => {
        let dev = window.devices[info.friendly_name] || window.devices[info.id];
        if (dev) {
          count++;
          if (dev.state === 'ON') {
            onCount++;
            if (dev.brightness) {
              let b = dev.brightness;
              if (b > 100) b = Math.round((b / 254) * 100);
              totalBri += b;
            }
          }
        }
      });
      const onSpan = el.querySelector('.room-on-devices');
      if (onSpan) onSpan.textContent = onCount + ' on';
      const countSpan = el.querySelector('.room-devices-count');
      if (countSpan) countSpan.textContent = count + ' devices';

      let avg = onCount > 0 ? Math.round(totalBri / onCount) : 0;
      avg = Math.max(0, Math.min(100, avg));
      const bSlider = el.querySelector('.room-brightness');
      if (bSlider) {
        bSlider.value = avg;
        bSlider.style.display = onCount > 0 ? 'block' : 'none';
      }
      const bVal = el.querySelector('.brightness-value');
      if (bVal) bVal.textContent = avg + '%';
      el.classList.toggle('on', onCount > 0);
      el.classList.toggle('off', onCount === 0);
    });
  }

  function syncRoomStatesAfterLoad() {
    document.querySelectorAll('.room').forEach(roomEl => {
      const room = roomEl.getAttribute('data-room-name');
      const devices = Array.from(roomEl.querySelectorAll('.device'));
      let anyOn = false;
      devices.forEach(d => {
        const id = d.getAttribute('data-device');
        const dev = window.devices[id];
        const toggle = d.querySelector('.device-toggle');
        if (dev && dev.state === 'ON' && toggle) {
          toggle.checked = true;
          d.classList.add('on'); d.classList.remove('off');
          anyOn = true;
        }
      });
      if (anyOn) {
        roomEl.classList.add('on');
        const bSlider = roomEl.querySelector('.room-brightness');
        if (bSlider) bSlider.style.display = 'block';
      } else roomEl.classList.remove('on');
    });
    updateRoomColors();
  }

  function updateRoomColors() {
    document.querySelectorAll('.room').forEach(roomEl => {
      const devices = Array.from(roomEl.querySelectorAll('.device'));
      const onDevices = devices.filter(d => d.classList.contains('on') || d.querySelector('.device-toggle')?.checked);
      if (onDevices.length) {
        let r = 0, g = 0, b = 0, cnt = 0;
        onDevices.forEach(d => {
          const picker = d.querySelector('.color-picker');
          if (picker && d.querySelector('.device-toggle')?.checked) {
            const col = picker.value.replace('#', '');
            r += parseInt(col.substr(0,2), 16);
            g += parseInt(col.substr(2,2), 16);
            b += parseInt(col.substr(4,2), 16);
            cnt++;
          }
        });
        if (cnt) {
          r = Math.round(r / cnt); g = Math.round(g / cnt); b = Math.round(b / cnt);
          roomEl.style.setProperty('--room-color', `rgb(${r},${g},${b})`);
        }
        roomEl.classList.add('on');
      } else {
        roomEl.classList.remove('on');
      }
    });
  }

  function toggleRoom(roomName, state) {
    const devs = window.roomDevices[roomName] || [];
    if (!devs.length) return;
    const cmd = { state: state ? 'ON' : 'OFF' };
    devs.forEach(id => window.sendCommand?.(id, cmd));
    if (typeof showNotification === 'function') showNotification(`${state ? 'Turning on' : 'Turning off'} ${roomName}`, 'success');
  }

  function setRoomBrightness(roomName, brightness) {
    const devs = window.roomDevices[roomName] || [];
    if (!devs.length) return;
    const cmd = { brightness: Math.round((parseInt(brightness) / 100) * 254) };
    devs.forEach(id => window.sendCommand?.(id, cmd));
  }

  function setDeviceBrightness(deviceId, brightness) {
    window.sendCommand?.(deviceId, { brightness: Math.round((parseInt(brightness) / 100) * 255) });
  }

  function setDeviceColor(deviceId, color) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0,2), 16);
    const g = parseInt(hex.substr(2,2), 16);
    const b = parseInt(hex.substr(4,2), 16);
    window.sendCommand?.(deviceId, { color: { r, g, b } });
  }

  function updateDeviceUIFromMQTT(deviceId, data) {
    const deviceEl = document.getElementById('device-' + deviceId);
    if (!deviceEl) return;
    const toggle = deviceEl.querySelector('.device-toggle');
    if (toggle && data.state !== undefined) {
      toggle.checked = data.state === 'ON';
      deviceEl.classList.toggle('on', data.state === 'ON');
      deviceEl.classList.toggle('off', data.state !== 'ON');
      const bSlider = deviceEl.querySelector('.device-brightness');
      if (bSlider) bSlider.style.display = data.state === 'ON' ? 'block' : 'none';
    }
    if (data.brightness !== undefined) {
      const bSlider = deviceEl.querySelector('.device-brightness');
      if (bSlider) bSlider.value = Math.round((data.brightness / 254) * 100);
    }
    if (data.color?.hex) {
      const picker = deviceEl.querySelector('.color-picker');
      if (picker) picker.value = data.color.hex;
      deviceEl.style.setProperty('--device-color', data.color.hex);
    }
    const roomEl = deviceEl.closest('.room');
    if (roomEl) {
      const anyOn = Array.from(roomEl.querySelectorAll('.device')).some(d => d.classList.contains('on'));
      const bSlider = roomEl.querySelector('.room-brightness');
      if (bSlider) bSlider.style.display = anyOn ? 'block' : 'none';
      updateRoomColors();
    }
  }

  function updateAllRoomControls() {
    console.log('🦆 updateAllRoomControls called');
    if (!window.roomDeviceMappings) return;
    if (!window.devices || Object.keys(window.devices).length === 0) return;

    Object.entries(window.roomDeviceMappings).forEach(([roomName, deviceMappings]) => {
      deviceMappings.forEach(deviceInfo => {
        const deviceId = deviceInfo.id;
        const friendlyName = deviceInfo.friendly_name;
        let deviceData = window.devices[deviceInfo.friendly_name] ||
                         window.devices[deviceId] ||
                         window.devices[friendlyName];

        if (!deviceData) {
          const lower = deviceInfo.friendly_name.toLowerCase();
          const foundKey = Object.keys(window.devices).find(key => key.toLowerCase() === lower);
          if (foundKey) deviceData = window.devices[foundKey];
        }
        if (!deviceData) {
          const foundKey = Object.keys(window.devices).find(key =>
            key.includes(deviceId) || key.includes(friendlyName) ||
            (window.devices[key] && window.devices[key].friendly_name === friendlyName)
          );
          if (foundKey) deviceData = window.devices[foundKey];
        }

        if (deviceData) {
          updateDeviceInRoom(deviceId, deviceData);
        } else {
          console.warn(`🦆 No data found for device ${deviceId}/${friendlyName}`);
        }
      });
      updateRoomHeaderState(roomName);
    });
    updateRoomColors();
    updateRoomStats();
  }

  function updateDeviceInRoom(deviceId, data) {
    let deviceEl = document.getElementById('device-' + deviceId);
    if (!deviceEl) deviceEl = document.querySelector(`[data-device="${deviceId}"]`);
    if (!deviceEl && window.deviceMappings) {
      const info = Object.values(window.deviceMappings).find(d => d.id === deviceId);
      if (info && info.friendly_name) {
        const allNames = document.querySelectorAll('.device-name');
        for (const el of allNames) {
          if (el.textContent.trim() === info.friendly_name) {
            deviceEl = el.closest('.device');
            break;
          }
        }
      }
    }
    if (!deviceEl) {
      const alt = document.querySelector(`[data-device="${deviceId}"]`);
      if (alt) deviceEl = alt;
      else {
        const all = document.querySelectorAll('[data-device]');
        for (const el of all) {
          if (el.querySelector('.device-name')?.textContent === deviceId) {
            deviceEl = el;
            break;
          }
        }
      }
    }
    if (!deviceEl) return;

    const toggle = deviceEl.querySelector('.device-toggle');
    const bSlider = deviceEl.querySelector('.device-brightness');
    const picker = deviceEl.querySelector('.color-picker');

    let state = data.state ?? data.State ?? data.STATE ?? data.power ?? data.Power;
    if (toggle && state !== undefined) {
      const isOn = typeof state === 'string' ? state.toUpperCase() === 'ON' : Boolean(state);
      toggle.checked = isOn;
      deviceEl.classList.toggle('on', isOn);
      deviceEl.classList.toggle('off', !isOn);
      if (bSlider) bSlider.style.display = isOn ? 'block' : 'none';
    }
    if (bSlider && data.brightness !== undefined) {
      bSlider.value = Math.round((data.brightness / 254) * 100);
    }
    if (picker && data.color) {
      const hex = normalizeColorFromState(data.color);
      if (hex) {
        picker.value = hex;
        deviceEl.style.setProperty('--device-color', hex);
      }
    }
  }

  function normalizeColorFromState(colorData) {
    if (!colorData) return '#ffffff';
    try {
      if (colorData.hex) return colorData.hex;
      if (typeof colorData === 'string') return normalizeColorFromState(JSON.parse(colorData));
      if (colorData.x !== undefined && colorData.y !== undefined) {
        const { x, y } = colorData;
        const z = 1.0 - x - y;
        const Y = 1.0;
        const X = (Y / y) * x;
        const Z = (Y / y) * z;
        let r = X * 1.656492 - Y * 0.354851 - Z * 0.255038;
        let g = -X * 0.707196 + Y * 1.655397 + Z * 0.036152;
        let b = X * 0.051713 - Y * 0.121364 + Z * 1.011530;
        const gamma = c => c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1/2.4) - 0.055;
        r = Math.round(Math.max(0, Math.min(1, gamma(r))) * 255);
        g = Math.round(Math.max(0, Math.min(1, gamma(g))) * 255);
        b = Math.round(Math.max(0, Math.min(1, gamma(b))) * 255);
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      }
      if (colorData.hue !== undefined || colorData.h !== undefined) {
        const h = (colorData.hue || colorData.h || 0) / 360;
        const s = (colorData.saturation || colorData.s || 100) / 100;
        const v = 1;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        let r, g, b;
        switch (i % 6) {
          case 0: r = v; g = t; b = p; break;
          case 1: r = q; g = v; b = p; break;
          case 2: r = p; g = v; b = t; break;
          case 3: r = p; g = q; b = v; break;
          case 4: r = t; g = p; b = v; break;
          case 5: r = v; g = p; b = q; break;
        }
        return `#${((1 << 24) + (Math.round(r*255) << 16) + (Math.round(g*255) << 8) + Math.round(b*255)).toString(16).slice(1)}`;
      }
    } catch (e) {}
    return '#ffffff';
  }

  function updateRoomHeaderState(roomName) {
    const roomEl = getRoomElement(roomName);
    if (!roomEl) return;
    const ids = window.roomDevices[roomName] || [];
    const anyOn = ids.some(id => window.devices[id]?.state === 'ON');
    const bSlider = roomEl.querySelector('.room-brightness');
    if (bSlider) bSlider.style.display = anyOn ? 'block' : 'none';
    if (anyOn) {
      const onDevs = ids.filter(id => window.devices[id]?.state === 'ON' && window.devices[id]?.brightness);
      if (onDevs.length) {
        const avg = Math.round(onDevs.reduce((sum, id) => sum + (window.devices[id].brightness || 0), 0) / onDevs.length / 2.54);
        if (bSlider) bSlider.value = avg;
      }
    }
  }

  function syncRoomTogglesFromState() {
    if (!window.roomDevices || !window.devices) return;
    Object.entries(window.roomDevices).forEach(([room, ids]) => {
      const anyOn = ids.some(id => window.devices[id]?.state === 'ON');
      const roomEl = getRoomElement(room);
      if (roomEl) {
        roomEl.classList.toggle('on', anyOn);
        roomEl.classList.toggle('off', !anyOn);
        const bSlider = roomEl.querySelector('.room-brightness');
        if (bSlider) bSlider.style.display = anyOn ? 'block' : 'none';
      }
    });
  }

  function setInitialRoomCollapse() {
    document.querySelectorAll('.room').forEach(roomEl => {
      const room = roomEl.getAttribute('data-room-name');
      const ids = window.roomDevices[room] || [];
      const anyOn = ids.some(id => window.devices[id]?.state === 'ON');
      if (!anyOn) {
        const devsEl = roomEl.querySelector('.devices');
        const btn = roomEl.querySelector('.collapse-btn');
        if (devsEl && btn) {
          devsEl.classList.add('hidden');
          btn.textContent = '▸';
        }
      }
    });
  }

  window.updateRoomStats = updateRoomStats;
  window.updateRoomColors = updateRoomColors;
  window.syncRoomStatesAfterLoad = syncRoomStatesAfterLoad;
  window.updateAllRoomControls = updateAllRoomControls;
  window.updateDeviceUIFromMQTT = updateDeviceUIFromMQTT;
  window.syncRoomTogglesFromState = syncRoomTogglesFromState;
  window.setInitialRoomCollapse = setInitialRoomCollapse;

  function initRoomControlsWithSlide() {
    console.log('🦆 Initializing room controls with horizontal slide-to-brightness!');
    document.querySelectorAll('.room').forEach(roomEl => {
      let isSliding = false;
      let startX = 0;
      let startBrightness = 0;
      let touchStartX = 0;

      roomEl.addEventListener('mousedown', function (e) {
        if (!roomEl.classList.contains('on')) return;
        if (e.target.closest('.collapse-btn') || e.target.closest('input')) return;
        isSliding = true;
        startX = e.clientX;
        startBrightness = parseInt(roomEl.querySelector('.room-brightness').value) || 100;
        roomEl.classList.add('brightness-sliding', 'brightness-active');
        updateBrightnessDisplay(roomEl, startBrightness);
        e.preventDefault(); e.stopPropagation();
      });

      roomEl.addEventListener('touchstart', function (e) {
        if (!roomEl.classList.contains('on')) return;
        if (e.target.closest('.collapse-btn') || e.target.closest('input')) return;
        isSliding = true;
        touchStartX = e.touches[0].clientX;
        startBrightness = parseInt(roomEl.querySelector('.room-brightness').value) || 100;
        roomEl.classList.add('brightness-sliding', 'brightness-active');
        updateBrightnessDisplay(roomEl, startBrightness);
        e.preventDefault(); e.stopPropagation();
      }, { passive: false });

      document.addEventListener('mousemove', function (e) {
        if (!isSliding) return;
        const deltaX = e.clientX - startX;
        const newBrightness = calculateNewBrightness(startBrightness, deltaX);
        updateRoomBrightness(roomEl, newBrightness);
        updateBrightnessDisplay(roomEl, newBrightness);
        e.preventDefault();
      });

      document.addEventListener('touchmove', function (e) {
        if (!isSliding) return;
        const deltaX = e.touches[0].clientX - touchStartX;
        const newBrightness = calculateNewBrightness(startBrightness, deltaX);
        updateRoomBrightness(roomEl, newBrightness);
        updateBrightnessDisplay(roomEl, newBrightness);
        e.preventDefault();
      }, { passive: false });

      function endSlide() {
        if (!isSliding) return;
        isSliding = false;
        roomEl.classList.remove('brightness-sliding', 'brightness-active');
        setTimeout(() => {
          const display = roomEl.querySelector('.brightness-value-display');
          if (display) display.style.opacity = '0';
        }, 500);
        playBrightnessSound();
      }

      document.addEventListener('mouseup', endSlide);
      document.addEventListener('touchend', endSlide);
      document.addEventListener('touchcancel', endSlide);
      document.addEventListener('mouseleave', function () { if (isSliding) endSlide(); });
    });

    function calculateNewBrightness(startBrightness, deltaX) {
      const change = Math.round(deltaX * 0.5);
      return Math.max(0, Math.min(100, startBrightness + change));
    }

    function updateRoomBrightness(roomEl, brightness) {
      const roomName = roomEl.getAttribute('data-room-name');
      const bSlider = roomEl.querySelector('.room-brightness');
      const bValue = roomEl.querySelector('.room-brightness-container .brightness-value');
      const indicator = roomEl.querySelector('.brightness-indicator');
      bSlider.value = brightness;
      if (bValue) bValue.textContent = brightness + '%';
      if (indicator) indicator.style.height = brightness + '%';
      const currentColor = getComputedStyle(roomEl).getPropertyValue('--room-color') || '#2ecc71';
      const adjusted = currentColor.replace('rgb(', 'rgba(').replace(')', ', ' + (0.3 + (brightness / 100) * 0.7) + ')');
      roomEl.style.setProperty('--room-color', adjusted);
      clearTimeout(roomEl._brightnessTimeout);
      roomEl._brightnessTimeout = setTimeout(() => {
        setRoomBrightness(roomName, brightness);
      }, 150);
    }

    function updateBrightnessDisplay(roomEl, brightness) {
      let display = roomEl.querySelector('.brightness-value-display');
      if (!display) {
        display = document.createElement('div');
        display.className = 'brightness-value-display';
        display.style.cssText = 'position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.7);color:#fff;padding:4px 10px;border-radius:20px;font-size:18px;font-weight:bold;z-index:10;opacity:0;transition:opacity 0.2s;';
        roomEl.appendChild(display);
      }
      display.textContent = brightness + '%';
      display.style.opacity = '1';
    }

    function playBrightnessSound() {
      try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ac.createOscillator(), gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, ac.currentTime);
        gain.gain.setValueAtTime(0.1, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.1);
        osc.start(); osc.stop(ac.currentTime + 0.1);
      } catch (e) {}
    }

    document.querySelectorAll('.collapse-btn').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const roomEl = this.closest('.room');
        const devicesEl = roomEl.querySelector('.devices');
        devicesEl.classList.toggle('hidden');
        this.textContent = devicesEl.classList.contains('hidden') ? '▸' : '▾';
      });
    });

    document.querySelectorAll('.device-toggle').forEach(toggle => {
      toggle.addEventListener('change', function () {
        const deviceEl = this.closest('.device');
        const deviceId = deviceEl.getAttribute('data-device');
        deviceEl.classList.add('loading');
        setTimeout(() => {
          if (window.sendCommand) window.sendCommand(deviceId, { state: this.checked ? 'ON' : 'OFF' });
          deviceEl.classList.toggle('on', this.checked);
          deviceEl.classList.toggle('off', !this.checked);
          deviceEl.classList.remove('loading');
          const bSlider = deviceEl.querySelector('.device-brightness');
          if (bSlider) bSlider.style.display = this.checked ? 'block' : 'none';
          updateRoomColors();
        }, 300);
      });
    });

    document.querySelectorAll('.device-brightness').forEach(slider => {
      slider.addEventListener('input', function () {
        const deviceEl = this.closest('.device');
        const deviceId = deviceEl.getAttribute('data-device');
        clearTimeout(this._timeout);
        this._timeout = setTimeout(() => {
          setDeviceBrightness(deviceId, this.value);
          updateRoomBrightnessFromDevices(deviceEl.closest('.room'));
        }, 200);
      });
    });

    document.querySelectorAll('.room-brightness').forEach(slider => {
      slider.addEventListener('input', function () {
        const roomEl = this.closest('.room');
        const roomName = roomEl.getAttribute('data-room-name');
        setRoomBrightness(roomName, this.value);
      });
    });

    document.querySelectorAll('.color-picker').forEach(picker => {
      picker.addEventListener('input', function () {
        const deviceEl = this.closest('.device');
        const deviceId = deviceEl.getAttribute('data-device');
        setDeviceColor(deviceId, this.value);
        deviceEl.style.setProperty('--device-color', this.value);
        deviceEl.classList.add('on');
        updateRoomColors();
      });
    });

    console.log('🦆 Slide-to-brightness controls initialized!');
  }

  function updateRoomBrightnessFromDevices(roomEl) {
    const sliders = Array.from(roomEl.querySelectorAll('.device.on .device-brightness'))
      .map(s => parseInt(s.value)).filter(v => !isNaN(v));
    if (sliders.length) {
      const avg = Math.round(sliders.reduce((a, b) => a + b) / sliders.length);
      const roomSlider = roomEl.querySelector('.room-brightness');
      const roomVal = roomEl.querySelector('.room-brightness-container .brightness-value');
      if (roomSlider) roomSlider.value = avg;
      if (roomVal) roomVal.textContent = avg + '%';
    }
  }

  window.initRoomControls = initRoomControlsWithSlide;

  class DuckStealer {
    constructor() {
      this.idleTime = 0;
      this.idleThreshold = 10000;
      this.duckActive = false;
      this.interval = null;
      this.init();
    }
    init() {
      const c = document.createElement('div');
      c.id = 'duck-container';
      document.body.appendChild(c);
      this.resetIdleTimer();
      ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(e => {
        document.addEventListener(e, () => {
          this.resetIdleTimer();
          if (this.duckActive) this.duckRunAway();
        });
      });
      this.startIdleTimer();
    }
    resetIdleTimer() {
      this.idleTime = 0;
      if (this.duckActive) {
        clearInterval(this.interval);
        this.duckRunAway();
      }
    }
    startIdleTimer() {
      setInterval(() => {
        this.idleTime += 1000;
        if (this.idleTime >= this.idleThreshold && !this.duckActive) this.activateDuck();
      }, 1000);
    }
    activateDuck() {
      this.duckActive = true;
      const c = document.getElementById('duck-container');
      const h3 = document.querySelector('.room-controls-section h3');
      if (!h3) return;
      const duck = document.createElement('div');
      duck.className = 'duck walking';
      duck.innerHTML = '🦆';
      duck.style.bottom = '-50px'; duck.style.right = '-50px';
      c.appendChild(duck);
      c.style.bottom = '0px'; c.style.right = '0px';
      setTimeout(() => {
        const rect = h3.getBoundingClientRect();
        duck.style.bottom = (window.innerHeight - rect.top + 20) + 'px';
        duck.style.right = (window.innerWidth - rect.left - 50) + 'px';
        setTimeout(() => {
          duck.classList.remove('walking');
          const stolen = h3.cloneNode(true);
          stolen.className = 'stolen-h3';
          stolen.style.bottom = '15px'; stolen.style.right = '40px';
          duck.appendChild(stolen);
          h3.classList.add('h3-stolen');
          setTimeout(() => {
            duck.classList.add('walking');
            duck.style.bottom = '-100px'; duck.style.right = '-100px';
            setTimeout(() => {
              duck.remove();
              c.style.bottom = '-100px'; c.style.right = '-100px';
              h3.classList.remove('h3-stolen');
              this.duckActive = false;
            }, 2000);
          }, 1000);
        }, 1500);
      }, 1000);
    }
    duckRunAway() {
      const duck = document.querySelector('.duck');
      if (!duck) return;
      duck.classList.add('walking');
      duck.style.bottom = '-100px'; duck.style.right = '-100px';
      const stolen = document.querySelector('.stolen-h3');
      if (stolen) stolen.remove();
      const h3 = document.querySelector('.room-controls-section h3');
      if (h3) h3.classList.remove('h3-stolen');
      setTimeout(() => {
        duck.remove();
        const c = document.getElementById('duck-container');
        c.style.bottom = '-100px'; c.style.right = '-100px';
        this.duckActive = false;
      }, 1000);
    }
  }

  let mediaCurrentPath = "";
  let mediaInitialized = false;


  window.loadMediaDirectory = async function(path = "") {
      try {
          const response = await fetch(`/api/browse?path=${encodeURIComponent(path)}`);
          if (!response.ok) throw new Error('Failed to load media directory');
          const data = await response.json();

          if (data.error) {
              console.error('Media error:', data.error);
              if (typeof showNotification === 'function') showNotification(data.error, 'error');
              return;
          }

          mediaCurrentPath = data.path;
          updateMediaBreadcrumbs(data.path);
          renderMediaItems(data.directories, data.files);
      } catch (error) {
          console.error('Media browse error:', error);
          if (typeof showNotification === 'function') showNotification('Failed to load media directory', 'error');
      }
  };

  function renderMediaItems(directories, files) {
    const container = document.getElementById('mediaList');
    if (!container) return;
    container.innerHTML = '';

    directories.forEach(dir => {
      const item = document.createElement('div');
      item.className = 'media-item directory';
      item.innerHTML = `<i class="mdi mdi-folder"></i><span>${escapeHtml(dir)}</span>`;
      item.onclick = () => window.loadMediaDirectory(joinMediaPath(mediaCurrentPath, dir));
      container.appendChild(item);
    });

    files.forEach(file => {
      const item = document.createElement('div');
      item.className = 'media-item file';
      item.innerHTML = `<i class="mdi mdi-file"></i><span>${escapeHtml(file)}</span>`;
      item.onclick = () => handleMediaFileClick(file);
      container.appendChild(item);
    });

    if (directories.length === 0 && files.length === 0) {
      container.innerHTML = '<div class="empty-media">Empty directory</div>';
    }
  }

  function handleMediaFileClick(fileName) {
    const fullPath = joinMediaPath(mediaCurrentPath, fileName);
    fetch(`/playlist/add?entry=${encodeURIComponent(fullPath)}`, { method: 'POST' })
      .then(() => {
        if (typeof showNotification === 'function') showNotification(`Added to playlist: ${fileName}`, 'success');
      })
      .catch(() => {
        if (typeof showNotification === 'function') showNotification('Failed to add to playlist', 'error');
      });
  }

  function updateMediaBreadcrumbs(path) {
    const container = document.getElementById('mediaBreadcrumbs');
    if (!container) return;
    container.innerHTML = '';
    const root = document.createElement('span');
    root.textContent = '/';
    root.onclick = () => window.loadMediaDirectory('');
    container.appendChild(root);

    const crumbs = path ? path.split('/') : [];
    crumbs.forEach((segment, i) => {
      const span = document.createElement('span');
      span.textContent = ' / ' + segment;
      const fullPath = crumbs.slice(0, i + 1).join('/');
      span.onclick = () => window.loadMediaDirectory(fullPath);
      container.appendChild(span);
    });
  }

  window.mediaGoBack = function() {
    if (!mediaCurrentPath) return;
    const parentPath = mediaCurrentPath.split('/').slice(0, -1).join('/');
    window.loadMediaDirectory(parentPath);
  };

  function joinMediaPath(base, segment) {
    if (!base) return segment;
    return `${base}/${segment}`.replace(/\/+/g, '/');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function formatDays(days) {
    if (!days || days.length === 0 || days.length === 7) return 'every day';
    return days.slice().sort((a, b) => a - b).map(d => DAY_LABELS[d] || '?').join(' ');
  }
  function formatClock(h, m) {
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }
  function formatDuration(secs) {
    secs = Number(secs) || 0;
    if (secs < 60) return secs + 's';
    if (secs < 3600) {
      const m = Math.floor(secs / 60), s = secs % 60;
      return m + 'm ' + String(s).padStart(2, '0') + 's';
    }
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h + 'h ' + String(m).padStart(2, '0') + 'm';
  }


  function injectScheduleStyles() {
    if (document.getElementById('schedule-widget-styles')) return;
    const style = document.createElement('style');
    style.id = 'schedule-widget-styles';
    style.textContent = `
      .alarms-timers-section {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin: 20px 0;
        padding: 0 4px;
      }
      @media (max-width: 700px) {
        .alarms-timers-section { grid-template-columns: 1fr; }
      }
      .schedule-panel {
        background: rgba(255,255,255,0.05);
        border-radius: 16px;
        padding: 14px 16px;
        border: 1px solid rgba(255,255,255,0.1);
      }
      .schedule-panel h3 {
        margin: 0 0 12px 0;
        font-size: 1rem;
        letter-spacing: 1px;
        color: var(--primary, #00ffaa);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .schedule-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        margin-bottom: 8px;
        background: rgba(0,0,0,0.25);
        border-radius: 10px;
        border-left: 3px solid var(--primary, #00ffaa);
        transition: opacity 0.2s, border-color 0.2s;
      }
      .schedule-item:last-child { margin-bottom: 0; }
      .schedule-item.disabled {
        opacity: 0.45;
        border-left-color: #666;
      }
      .schedule-item .item-info {
        display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1;
      }
      .schedule-item .item-time {
        font-size: 1.5rem;
        font-weight: 700;
        font-family: 'Poppins', ui-monospace, monospace;
        line-height: 1.05;
        color: #fff;
        letter-spacing: 0.5px;
      }
      .schedule-item.disabled .item-time { color: #999; }
      .schedule-item .item-name {
        font-size: 0.82rem; color: #ccc;
        white-space: nowrap; overflow: hidden;
        text-overflow: ellipsis; max-width: 200px;
      }
      .schedule-item .item-meta {
        font-size: 0.68rem; color: #888; letter-spacing: 0.5px;
        display: flex; gap: 6px; align-items: center;
      }
      .schedule-item .item-meta .dot { opacity: 0.5; }
      .schedule-item .item-actions {
        display: flex; gap: 6px; align-items: center; flex-shrink: 0;
      }
      .schedule-btn {
        background: rgba(255,255,255,0.08);
        border: none; border-radius: 8px;
        height: 34px; min-width: 34px; padding: 0 10px;
        cursor: pointer; color: white; font-size: 0.72rem;
        font-weight: 700; letter-spacing: 0.5px;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.15s;
      }
      .schedule-btn:hover { transform: scale(1.05); }

      .schedule-btn.state-pill.is-on {
        background: rgba(0, 255, 170, 0.22);
        color: #00ffaa;
        box-shadow: 0 0 0 1px rgba(0,255,170,0.35) inset;
      }
      .schedule-btn.state-pill.is-on:hover {
        background: rgba(0, 255, 170, 0.35);
      }
      .schedule-btn.state-pill.is-off {
        background: rgba(255,255,255,0.05);
        color: #888;
        box-shadow: 0 0 0 1px rgba(255,255,255,0.08) inset;
      }
      .schedule-btn.state-pill.is-off:hover {
        background: rgba(255,255,255,0.12);
        color: #ccc;
      }

      .schedule-btn.pause-btn {
        background: rgba(56, 189, 248, 0.2);
        color: #38bdf8;
      }
      .schedule-btn.pause-btn:hover { background: rgba(56, 189, 248, 0.35); }
      .schedule-btn.danger { color: #ff6b6b; }
      .schedule-btn.danger:hover { background: rgba(231, 76, 60, 0.6); color: #fff; }
      .schedule-empty {
        color: #777; font-size: 0.82rem;
        padding: 10px; text-align: center; font-style: italic;
      }
    `;
    document.head.appendChild(style);
  }

  function injectScheduleHTML() {
    if (document.getElementById('alarmsTimersSection')) return;
    const home = document.getElementById('pageHome');
    if (!home) return;

    const section = document.createElement('div');
    section.className = 'alarms-timers-section';
    section.id = 'alarmsTimersSection';
    section.innerHTML = `
      <div class="schedule-panel">
        <h3><i class="fas fa-clock"></i> ALARMS</h3>
        <div id="alarmsList"><div class="schedule-empty">Loading…</div></div>
      </div>
      <div class="schedule-panel">
        <h3><i class="fas fa-hourglass-half"></i> TIMERS</h3>
        <div id="timersList"><div class="schedule-empty">Loading…</div></div>
      </div>
    `;

    const roomControls = home.querySelector('.room-controls-section');
    if (roomControls) home.insertBefore(section, roomControls);
    else home.appendChild(section);
  }

  async function loadAlarms() {
    const box = document.getElementById('alarmsList');
    if (!box) return;
    const panel = box.closest('.schedule-panel');
    try {
      const res = await fetch('/api/alarms');
      const alarms = await res.json();

      if (!Array.isArray(alarms) || alarms.length === 0) {
        if (panel) panel.style.display = 'none';
        refreshScheduleSectionVisibility();
        return;
      }
      if (panel) panel.style.display = '';

      box.innerHTML = alarms.map(a => `
        <div class="schedule-item ${a.enabled ? '' : 'disabled'}">
          <div class="item-info">
            <div class="item-time">${formatClock(a.hour, a.minute)}</div>
            <div class="item-name">${escapeHtml(a.name || 'Alarm')}</div>
            <div class="item-meta">
              <span>${a.enabled ? 'Active' : 'Disabled'}</span>
              <span class="dot">•</span>
              <span>${formatDays(a.days)}</span>
            </div>
          </div>
          <div class="item-actions">
            <button class="schedule-btn state-pill ${a.enabled ? 'is-on' : 'is-off'}"
                    data-action="toggle-alarm" data-id="${a.id}"
                    title="${a.enabled ? 'Click to disable' : 'Click to enable'}">
              ${a.enabled ? 'ON' : 'OFF'}
            </button>
            <button class="schedule-btn danger"
                    data-action="delete-alarm" data-id="${a.id}"
                    title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `).join('');
      refreshScheduleSectionVisibility();
    } catch (e) {
      console.error('loadAlarms:', e);
      if (panel) panel.style.display = '';
      box.innerHTML = '<div class="schedule-empty">Failed to load alarms</div>';
    }
  }


  async function loadTimers() {
    const box = document.getElementById('timersList');
    if (!box) return;
    const panel = box.closest('.schedule-panel');
    try {
      const res = await fetch('/api/timers');
      const timers = await res.json();

      if (!Array.isArray(timers) || timers.length === 0) {
        if (panel) panel.style.display = 'none';
        refreshScheduleSectionVisibility();
        return;
      }
      if (panel) panel.style.display = '';

      box.innerHTML = timers.map(t => `
        <div class="schedule-item ${t.paused ? 'disabled' : ''}">
          <div class="item-info">
            <div class="item-time">${formatDuration(t.remaining_seconds)}</div>
            <div class="item-name">${escapeHtml(t.name || 'Timer')}</div>
            <div class="item-meta">
              <span>${t.paused ? 'Paused' : 'Running'}</span>
            </div>
          </div>
          <div class="item-actions">
            <button class="schedule-btn pause-btn"
                    data-action="toggle-timer" data-id="${t.id}" data-paused="${t.paused}"
                    title="${t.paused ? 'Resume' : 'Pause'}">
              <i class="fas fa-${t.paused ? 'play' : 'pause'}"></i>
            </button>
            <button class="schedule-btn danger"
                    data-action="cancel-timer" data-id="${t.id}"
                    title="Cancel">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      `).join('');
      refreshScheduleSectionVisibility();
    } catch (e) {
      console.error('loadTimers:', e);
      if (panel) panel.style.display = '';
      box.innerHTML = '<div class="schedule-empty">Failed to load timers</div>';
    }
  }

  function refreshScheduleSectionVisibility() {
    const section = document.getElementById('alarmsTimersSection');
    if (!section) return;
    const panels = section.querySelectorAll('.schedule-panel');
    const anyVisible = Array.from(panels).some(p => p.style.display !== 'none');
    section.style.display = anyVisible ? '' : 'none';
  }

  async function handleScheduleClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    try {
      if (action === 'toggle-alarm') {
        await fetch(`/api/alarms/toggle?id=${id}`, { method: 'POST' });
        loadAlarms();
      } else if (action === 'delete-alarm') {
        if (!confirm('Delete this alarm?')) return;
        await fetch(`/api/alarms/remove?id=${id}`, { method: 'POST' });
        loadAlarms();
      } else if (action === 'toggle-timer') {
        const paused = btn.dataset.paused === 'true';
        const url = paused ? `/api/timers/resume?id=${id}` : `/api/timers/pause?id=${id}`;
        await fetch(url, { method: 'POST' });
        loadTimers();
      } else if (action === 'cancel-timer') {
        await fetch(`/api/timers/cancel?id=${id}`, { method: 'POST' });
        loadTimers();
      }
    } catch (err) {
      console.error('schedule action failed:', err);
      if (typeof showNotification === 'function') showNotification('Action failed', 'error');
    }
  }

  function initAlarmsTimers() {
    injectScheduleStyles();
    injectScheduleHTML();
    const section = document.getElementById('alarmsTimersSection');
    if (!section) return;
    section.addEventListener('click', handleScheduleClick);
    loadAlarms();
    loadTimers();
    setInterval(() => {
      const home = document.getElementById('pageHome');
      if (home && home.style.display !== 'none') {
        loadAlarms();
        loadTimers();
      }
    }, 5000);
  }

  document.addEventListener('DOMContentLoaded', () => new DuckStealer());

  document.addEventListener('DOMContentLoaded', async () => {
    await loadBaseTopic();
    await loadCardConfig();
    if (window.initStatusCards) window.initStatusCards();
    if (window.initRoomControls) window.initRoomControls();
    initAlarmsTimers();
  });

})();
