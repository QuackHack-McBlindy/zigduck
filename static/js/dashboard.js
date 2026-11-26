if (typeof window.showNotification !== 'function') {
    window.showNotification = function(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        const el = document.getElementById('notification');
        if (el) {
            el.textContent = message;
            el.className = 'notification show';
            clearTimeout(el._hideTimeout);
            el._hideTimeout = setTimeout(() => el.className = 'notification hidden', 3000);
        }
    };
}

function loadChartJS() {
  return new Promise((resolve) => {
    if (typeof Chart !== 'undefined') {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

window.syncRoomToggles = function() {
  if (!window.roomDevices || !window.devices) return;
  Object.entries(window.roomDevices).forEach(([roomName, deviceIds]) => {
    const anyDeviceOn = deviceIds.some(deviceId => {
      const device = window.devices[deviceId];
      return device && device.state === 'ON';
    });
    const toggle = document.querySelector(`.room-control-card[data-room="${roomName}"] .room-toggle`);
    if (toggle) {
      toggle.checked = anyDeviceOn;
    }
  });
};

window.toggleRoom = function(roomName, state) {
  console.log('Toggle room:', roomName, state);
  const devices = window.roomDevices ? window.roomDevices[roomName] : [];
  if (!devices || devices.length === 0) {
    console.error('No devices found for room:', roomName);
    showNotification('No devices found in ' + roomName, 'error');
    return;
  }
  const command = { state: state ? 'ON' : 'OFF' };
  console.log('Sending command to devices:', devices, command);
  devices.forEach(device => {
    if (window.sendCommand) {
      window.sendCommand(device, command);
    } else {
      console.error('sendCommand not available');
    }
  });
  showNotification(`${state ? 'Turning on' : 'Turning off'} ${roomName}`, 'success');
};

window.setRoomBrightness = (function() {
  let timeoutId = null;
  const DEBOUNCE_DELAY = 500;
  return function(roomName, brightness) {
    console.log('Set room brightness:', roomName, brightness);
    const devices = window.roomDevices ? window.roomDevices[roomName] : [];
    if (!devices || devices.length === 0) {
      console.error('No devices found for room:', roomName);
      return;
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      const command = { brightness: parseInt(brightness) };
      console.log('Sending brightness to devices:', devices, command);
      devices.forEach(device => {
        if (window.sendCommand) {
          window.sendCommand(device, command);
        } else {
          console.error('sendCommand not available');
        }
      });
    }, DEBOUNCE_DELAY);
  };
})();

document.addEventListener('DOMContentLoaded', function() {
    let client = null;
    const statusElement = document.getElementById('connectionStatus');
    const notification = document.getElementById('notification');
    let connectionHideTimeout = null;
    let mediaInitialized = false;

    if (window.initStatusCards) {
      window.initStatusCards();
    }

    function showConnectionStatus() {
        if (connectionHideTimeout) {
            clearTimeout(connectionHideTimeout);
            connectionHideTimeout = null;
        }
        statusElement.classList.remove('hidden');
    }

    let devices = {};
    let selectedDevice = null;
    let sceneData = window.DASHBOARD_DATA.sceneData;
    let deviceIcons = window.DASHBOARD_DATA.iconData;
    console.log('All device icons:', deviceIcons);
    console.log('Device friendly names:', Object.keys(deviceIcons));

    let mediaRecorder;
    let audioChunks = [];
    let recording = false;
    const transcriptionServerURL = "https://localhost:25451/transcribe";
    const recordingStatus = document.getElementById('recordingStatus');

    const pageContainer = document.getElementById('pageContainer');
    const navTabs = document.querySelectorAll('.nav-tab');
    let currentPage = 0;

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function normalizeColor(color) {
        if (typeof color === 'string' && color.startsWith('#')) {
            const hex = color.substring(1);
            return {
                r: parseInt(hex.substr(0, 2), 16),
                g: parseInt(hex.substr(2, 2), 16),
                b: parseInt(hex.substr(4, 2), 16),
                w: 0,
                hex: color
            };
        } else if (color && typeof color === 'object') {
            const r = color.r || 0;
            const g = color.g || 0;
            const b = color.b || 0;
            const w = color.w || 0;
            return {
                r, g, b, w,
                hex: `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
            };
        }
        return { r: 255, g: 255, b: 255, w: 0, hex: '#ffffff' };
    }

    window.roomDeviceMappings = Object.assign({}, window.DASHBOARD_DATA.roomDeviceMappings);

    window.roomDevices = {};
    Object.keys(window.roomDeviceMappings || {}).forEach(roomName => {
        if (window.roomDeviceMappings[roomName]) {
            window.roomDevices[roomName] = window.roomDeviceMappings[roomName].map(d => d.id);
        }
    });

    console.log('Room devices mapping:', window.roomDevices);

    function updateBattery(percent) {
      const fill = document.querySelector(".battery-fill");
      const text = document.querySelector(".battery-text");
      fill.style.width = percent + "%";
      text.textContent = percent + "%";
      fill.className = "battery-fill";
      if (percent > 60) fill.classList.add("high");
      else if (percent > 30) fill.classList.add("medium");
      else if (percent > 15) fill.classList.add("low");
      else fill.classList.add("critical");
    }

    function setRangeGradient(slider, startColor, endColor) {
        const existingStyle = document.getElementById('sliderGradientStyle');
        if (existingStyle) {
            existingStyle.remove();
        }
        const style = document.createElement('style');
        style.id = 'sliderGradientStyle';
        const sliderId = `slider-${Math.random().toString(36).substr(2, 9)}`;
        slider.id = sliderId;
        style.textContent = `
            #${sliderId} {
                background: linear-gradient(to right, ${startColor}, ${endColor});
            }
            #${sliderId}::-webkit-slider-thumb {
                background: var(--primary);
            }
            #${sliderId}::-moz-range-thumb {
                background: var(--primary);
            }
        `;
        document.head.appendChild(style);
    }

    function valueColor(key, value) {
        if (key === 'temperature') {
            if (value > 30) return '#e74c3c';
            if (value < 15) return '#3498db';
            return '#2ecc71';
        }
        if (key === 'humidity') {
            if (value > 70) return '#3498db';
            if (value < 30) return '#e67e22';
            return '#2ecc71';
        }
        if (key === 'linkquality') {
            if (value > 100) return '#2ecc71';
            if (value > 50) return '#f39c12';
            return '#e74c3c';
        }
        return null;
    }

    function formatValue(key, value) {
        if (key === 'last_seen') {
            return new Date(value).toLocaleString();
        }
        if (typeof value === 'number') {
            return Number(value.toFixed(2)).toString();
        }
        return String(value);
    }

    function linkQualityText(value) {
        if (value > 200) return 'Excellent';
        if (value > 100) return 'Good';
        if (value > 50) return 'Fair';
        return 'Poor';
    }

    function timeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
        return 'Just now';
    }

    function loadSavedState() {
        try {
            const savedState = localStorage.getItem('duckDashState');
            if (savedState) {
                const state = JSON.parse(savedState);
                if (state.devices) {
                    devices = {...state.devices, ...devices};
                    updateDeviceSelector();
                }
                if (state.selectedDevice) {
                    selectedDevice = state.selectedDevice;
                    window.selectedDevice = selectedDevice;
                    document.getElementById('deviceSelect').value = selectedDevice;
                    if (devices[selectedDevice]) {
                        updateDeviceUI(devices[selectedDevice]);
                    }
                }
                if (state.currentPage !== undefined) {
                    showPage(state.currentPage);
                }
                showNotification('Saved state loaded', 'success');
            }
        } catch (e) {
            console.error('Error loading saved state:', e);
            showNotification('Error loading saved data', 'error');
        }
    }

    function saveState() {
        try {
            const state = {
                devices: devices,
                selectedDevice: selectedDevice,
                currentPage: currentPage,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('duckDashState', JSON.stringify(state));
        } catch (e) {
            console.error('Error saving state:', e);
            showNotification('Error saving data', 'error');
        }
    }

    function clearSavedState() {
        try {
            localStorage.removeItem('duckDashState');
            devices = {};
            selectedDevice = null;
            window.selectedDevice = null;
            updateDeviceSelector();
            document.getElementById('currentDeviceName').textContent = 'quack or tap a device';
            document.getElementById('currentDeviceStatus').textContent = 'up there yo';
            showNotification('Saved data cleared', 'success');
        } catch (e) {
            console.error('Error clearing saved state:', e);
            showNotification('Error clearing data', 'error');
        }
    }

    window.publishPatch = publishPatch;
    window.selectedDevice = selectedDevice;

    window.setColor = function(hex) {
        if (hex === 'rainbow') {
            const r = Math.floor(Math.random() * 256);
            const g = Math.floor(Math.random() * 256);
            const b = Math.floor(Math.random() * 256);
            publishPatch({ color: { r, g, b } });
            return;
        }
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        publishPatch({ color: { r, g, b } });
    };

    window.openColorPicker = function() {
        document.getElementById('hiddenColorPicker').click();
    };

    window.normalizeColor = function(color) {
        if (typeof color === 'string' && color.startsWith('#')) {
            const hex = color.substring(1);
            return {
                r: parseInt(hex.substr(0, 2), 16),
                g: parseInt(hex.substr(2, 2), 16),
                b: parseInt(hex.substr(4, 2), 16),
                hex: color
            };
        } else if (color && typeof color === 'object') {
            const r = color.r || 0;
            const g = color.g || 0;
            const b = color.b || 0;
            return {
                r, g, b,
                hex: `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
            };
        }
        return { r: 255, g: 255, b: 255, hex: '#ffffff' };
    };

    function addDeviceParticles() {
        const devicesPage = document.getElementById('pageDevices');
        if (!devicesPage) return;
        const particleContainer = document.createElement('div');
        particleContainer.className = 'devices-particles';
        devicesPage.appendChild(particleContainer);
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'devices-particle';
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const size = Math.random() * 10 + 2;
            particle.style.left = x + '%';
            particle.style.top = y + '%';
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            const colors = ['#00ffaa', '#38bdf8', '#8b5cf6', '#facc15', '#ef4444', '#22c55e'];
            particle.style.background = `radial-gradient(circle at 30% 30%, ${colors[Math.floor(Math.random() * colors.length)]}, transparent 70%)`;
            particle.animate([
                {
                    transform: 'translate(0, 0) rotate(0deg)',
                    opacity: Math.random() * 0.5 + 0.3
                },
                {
                    transform: `translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) rotate(${Math.random() * 360}deg)`,
                    opacity: 0.1
                }
            ], {
                duration: 5000 + Math.random() * 5000,
                iterations: Infinity,
                direction: 'alternate',
                easing: 'ease-in-out'
            });
            particleContainer.appendChild(particle);
        }
    }

    function playDeviceSound(type) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            let frequency = 800;
            let duration = 0.2;
            switch(type) {
                case 'toggle':
                    frequency = 600;
                    duration = 0.3;
                    break;
                case 'slider':
                    frequency = 400;
                    duration = 0.1;
                    break;
                case 'color':
                    frequency = 1000;
                    duration = 0.4;
                    break;
                case 'success':
                    frequency = 1200;
                    duration = 0.5;
                    break;
                case 'error':
                    frequency = 300;
                    duration = 0.3;
                    break;
                default:
                    frequency = 800;
                    duration = 0.2;
            }
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, audioContext.currentTime + duration);
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        } catch (e) {
            console.log('No audio support, silent device control!');
        }
    }

    function enhancedToggleAnimation(checkbox) {
        const toggleContainer = checkbox.closest('.state-display');
        if (!toggleContainer) return;
        if (checkbox.checked) {
            toggleContainer.classList.remove('state-off');
            toggleContainer.classList.add('state-on');
            playDeviceSound('toggle');
            toggleContainer.classList.add('success');
            setTimeout(() => toggleContainer.classList.remove('success'), 500);
        } else {
            toggleContainer.classList.remove('state-on');
            toggleContainer.classList.add('state-off');
            playDeviceSound('toggle');
        }
    }

    function enhancedColorPick(color, element) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2;
        const x = rect.left + rect.width / 2 - size / 2;
        const y = rect.top + rect.height / 2 - size / 2;
        ripple.style.cssText = `
            position: fixed;
            border-radius: 50%;
            background: ${color};
            transform: scale(0);
            animation: ripple 0.6s linear;
            width: ${size}px;
            height: ${size}px;
            top: ${y}px;
            left: ${x}px;
            pointer-events: none;
            z-index: 1000;
            opacity: 0.3;
        `;
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
        playDeviceSound('color');
        playQuackSound();
    }

    function initDevicesPageWithPersonality() {
        console.log('Initializing devices page!!');
        setTimeout(addDeviceParticles, 500);
        document.querySelectorAll('.switch input').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                enhancedToggleAnimation(this);
            });
        });
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.addEventListener('click', function() {
                const color = this.style.backgroundColor || this.style.background;
                enhancedColorPick(color, this);
            });
        });
        document.querySelectorAll('.brightness-slider').forEach(slider => {
            let timeout;
            slider.addEventListener('input', function() {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    playDeviceSound('slider');
                    const valueDisplay = this.closest('.brightness-display').querySelector('.brightness-value');
                    if (valueDisplay) {
                        valueDisplay.style.transform = 'scale(1.1)';
                        setTimeout(() => valueDisplay.style.transform = 'scale(1)', 200);
                    }
                }, 200);
            });
        });
        document.querySelectorAll('.color-picker-btn, .cover-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                ripple.style.cssText = `
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.6);
                    transform: scale(0);
                    animation: ripple 0.6s linear;
                    width: ${size}px;
                    height: ${size}px;
                    top: ${y}px;
                    left: ${x}px;
                    pointer-events: none;
                `;
                this.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            });
        });
        const deviceHeader = document.querySelector('.device-header');
        if (deviceHeader) {
            deviceHeader.addEventListener('mouseenter', () => {
                playDeviceSound('success');
            });
        }
    }

    function updateDeviceSelector() {
        const selector = document.getElementById('deviceSelect');
        const currentValue = selector.value;
        while (selector.options.length > 1) {
            selector.remove(1);
        }
        Object.keys(devices).forEach(device => {
            const excludedPatterns = [
                'bridge',
                'bridge/',
                '../availability',
                'tibber',
                /^0x/,
            ];
            const shouldExclude = excludedPatterns.some(pattern => {
                if (typeof pattern === 'string') {
                    return device.includes(pattern);
                } else if (pattern instanceof RegExp) {
                    return pattern.test(device);
                }
                return false;
            });
            if (!shouldExclude) {
                const option = document.createElement('option');
                option.value = device;
                option.textContent = device;
                selector.appendChild(option);
            }
        });
        if (devices[currentValue]) {
            selector.value = currentValue;
        }
    }

    function updateDeviceUI(data) {
        console.log('Updating device UI for:', selectedDevice);
        console.log('Device data:', data);
        document.getElementById('currentDeviceName').textContent = selectedDevice;
        const statusText = data.state === 'ON' ? 'On • Connected' : 'Off • Connected';
        document.getElementById('currentDeviceStatus').textContent = statusText;
        const topic = `${window.DASHBOARD_DATA.baseTopic}/${selectedDevice}`;
        renderMessage(data, topic);
        console.log('Device icon:', deviceIcons[selectedDevice]);
        updateDeviceIcon(selectedDevice);
        updateRoomStats();
    }

    function updateDeviceIcon(deviceName) {
        console.log('updateDeviceIcon called for:', deviceName);
        const icon = deviceIcons[deviceName] || "mdi:duck";
        console.log('Resolved icon for', deviceName, ':', icon);
        const iconName = icon.replace("mdi:", "");
        const iconElement = document.getElementById('currentDeviceIcon');
        if (icon.startsWith('./') || icon.startsWith('/') || icon.includes('.png') || icon.includes('.svg')) {
            iconElement.innerHTML = `<img src="${icon}" alt="${deviceName}" class="device-image-icon">`;
        } else if (icon.startsWith('<') && icon.includes('>')) {
            iconElement.innerHTML = icon;
        } else {
            console.log('Icon element found:', !!iconElement);
            if (iconElement) {
                iconElement.className = 'mdi mdi-' + iconName;
                console.log('Final icon classes:', iconElement.className);
            }
        }
    }

    function sendCommand(deviceId, command) {
      let url = "";
      if (command.state) {
        url = `/api/device/${encodeURIComponent(deviceId)}/state/${command.state.toLowerCase()}`;
      } else if (command.brightness !== undefined) {
        url = `/api/device/${encodeURIComponent(deviceId)}/brightness/${command.brightness}`;
      } else if (command.color) {
        const hex = '#' + [command.color.r, command.color.g, command.color.b]
          .map(v => v.toString(16).padStart(2, '0')).join("");
        url = `/api/device/${encodeURIComponent(deviceId)}/color/${encodeURIComponent(hex)}`;
      } else if (command.color_temp !== undefined) {
        url = `/api/device/${encodeURIComponent(deviceId)}/temperature/${command.color_temp}`;
      }
      if (!url) return Promise.resolve();
      return fetch(url, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          if (data.error) showNotification(data.error, 'error');
          else console.log('Command sent:', data);
        })
        .catch(err => showNotification('Command failed', 'error'));
    }

    window.sendCommand = sendCommand;

    function showPage(pageId) {
        console.log('Switching to page:', pageId, typeof pageId);
        currentPage = pageId;
        const pages = document.querySelectorAll('.page');
        pages.forEach((page) => {
            page.style.display = 'none';
        });
        const deviceSelectorContainer = document.getElementById('deviceSelectorContainer');
        if (String(pageId) === "1") {
            deviceSelectorContainer.classList.remove('hidden');
        } else {
            deviceSelectorContainer.classList.add('hidden');
        }
        if (String(pageId) === "3") {
            window.loadMediaDirectory("");
        }
        navTabs.forEach((tab) => {
            const tabPageIndex = tab.getAttribute('data-page');
            if (tabPageIndex === String(pageId)) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        const pageElement = document.querySelector(`.page[data-page="${pageId}"]`);
        console.log('Looking for page with data-page="' + pageId + '"', pageElement);
        if (pageElement) {
            pageElement.style.display = 'block';
            console.log('Page found and displayed');
            const pageNum = parseInt(pageId);
            if (pageNum >= 4) {
                const initFunction = window['initPage' + pageId];
                console.log('Custom page init function:', initFunction);
                if (initFunction && typeof initFunction === 'function') {
                    console.log('Calling custom page init function');
                    initFunction();
                }
            }
        } else {
            console.error('Page element not found for data-page="' + pageId + '"');
            const fallbackPage = document.querySelector('.page[data-page="0"]');
            if (fallbackPage) {
                fallbackPage.style.display = 'block';
                console.log('Fallback to page 0');
            }
        }
        saveState();
    }

    function updateLinkquality(percent) {
      const bars = document.querySelectorAll(".lq-bar");
      const activeBars = Math.round((percent / 100) * bars.length);
      bars.forEach((bar, idx) => {
        bar.className = "lq-bar";
        if (idx < activeBars) {
          if (percent > 75) bar.classList.add("good");
          else if (percent > 50) bar.classList.add("ok");
          else if (percent > 25) bar.classList.add("bad");
          else bar.classList.add("terrible");
        }
      });
    }

    function updatePosition(value) {
        const position = clamp(parseInt(value), 0, 100);
        document.querySelector('.position-value').textContent = `${position}%`;
    }

    function publishPatch(payload) {
        if (!selectedDevice) {
            showNotification('Please select a device first', 'error');
            return;
        }
        console.group('publishPatch');
        console.log('Device:', selectedDevice);
        console.log('Payload:', payload);
        console.groupEnd();
        sendCommand(selectedDevice, payload);
    }

    function renderMessage(parsed, topic) {
        const devicePanel = document.getElementById('devicePanel');
        devicePanel.innerHTML = "";
        const deviceName = topic.split('/')[1] || 'Unknown';
        const title = document.createElement('div');
        title.className = 'panel-title';
        selectedDevice = deviceName;
        devicePanel.appendChild(title);
        const jsonDiv = document.createElement('div');
        jsonDiv.className = 'json';
        devicePanel.appendChild(jsonDiv);
        const entries = Object.entries(parsed);
        let controlsHtml = "";
        let rowsHtml = "";
        updateRoomStats();

        if ('state' in parsed) {
            const checked = String(parsed.state).toUpperCase() === 'ON' ? 'checked' : "";
            const stateText = parsed.state === 'ON' ? 'ON' : 'OFF';
            const stateClass = parsed.state === 'ON' ? 'state-on' : 'state-off';
            controlsHtml += `
                <div class="section">State</div>
                <div class="row special">
                    <div class="state-display ${stateClass}">
                        <label class="switch">
                            <input type="checkbox" class="device-state-toggle" ${checked}>
                            <span class="slider-round"></span>
                        </label>
                        <span class="state-text">${stateText}</span>
                    </div>
                </div>`;
        }

        if ('touch' in parsed) {
            const checked = String(parsed.touch).toUpperCase() === 'ON' ? 'checked' : "";
            const stateText = parsed.touch === 'ON' ? 'ON' : 'OFF';
            const stateClass = parsed.touch === 'ON' ? 'state-on' : 'state-off';
            controlsHtml += `
                <div class="section">Touch</div>
                <div class="row special">
                    <div class="state-display ${stateClass}">
                        <label class="switch">
                            <input type="checkbox" class="device-state-toggle" ${checked}>
                            <span class="slider-round"></span>
                        </label>
                        <span class="state-text">${stateText}</span>
                    </div>
                </div>`;
        }

        if ('reverse' in parsed) {
            const checked = String(parsed.reverse).toUpperCase() === 'ON' ? 'checked' : "";
            const stateText = parsed.reverse === 'ON' ? 'ON' : 'OFF';
            const stateClass = parsed.reverse === 'ON' ? 'state-on' : 'state-off';
            controlsHtml += `
                <div class="section">reverse</div>
                <div class="row special">
                    <div class="state-display ${stateClass}">
                        <label class="switch">
                            <input type="checkbox" class="device-state-toggle" ${checked}>
                            <span class="slider-round"></span>
                        </label>
                        <span class="state-text">${stateText}</span>
                    </div>
                </div>`;
        }

        if ('battery' in parsed) {
            const level = clamp(Number(parsed.battery) || 0, 0, 100);
            controlsHtml += `
                <div class="section">Battery</div>
                <div class="battery-container">
                    <div class="battery-fill" style="width:${level}%"></div>
                    <div class="battery-text">${level}%</div>
                </div>`;
        }

        if ('temperature' in parsed) {
            const temp = Number(parsed.temperature) || 0;
            let classes = 'temperature-value';
            if (temp < 20.0) classes += ' cold';
            else if (temp < 23.0) classes += ' good';
            else if (temp < 23.5) classes += ' warm';
            else if (temp < 24.0) classes += ' warmer';
            else classes += ' hot';
            controlsHtml += `
                <div class="section">Temperature</div>
                <div class="temperature-container">
                    <div class="${classes}">${temp.toFixed(2)}°C</div>
                </div>`;
        }

        if ('linkquality' in parsed) {
            const lq = clamp(Number(parsed.linkquality) || 0, 0, 100);
            const totalBars = 4;
            const activeBars = Math.round((lq / 100) * totalBars);
            let barsHtml = "";
            for (let i = 0; i < totalBars; i++) {
                let classes = 'lq-bar-mini';
                if (i < activeBars) {
                    if (lq > 75) classes += ' good';
                    else if (lq > 50) classes += ' ok';
                    else if (lq > 25) classes += ' bad';
                    else classes += ' terrible';
                } else {
                    classes += ' off';
                }
                barsHtml += `<div class="${classes}"></div>`;
            }
            const lqMini = document.querySelector('.linkquality-mini');
            if (lqMini) {
                lqMini.querySelector('.lq-bars').innerHTML = barsHtml;
                lqMini.querySelector('.lq-value').textContent = lq;
            }
        }

        if ('contact' in parsed) {
            const contact = parsed.contact;
            const contactText = contact ? 'Closed' : 'Open';
            const contactClass = contact ? 'contact-closed' : 'contact-open';
            controlsHtml += `
                <div class="section">Contactr</div>
                <div class="row special">
                    <div class="contact-status ${contactClass}">
                        ${contactText}
                    </div>
                </div>`;
        }

        if ('position' in parsed) {
            const position = clamp(Number(parsed.position) || 0, 0, 100);
            controlsHtml += `
                <div class="section">Position</div>
                <div class="row special">
                    <div class="position-controls">
                        <button class="cover-btn open" onclick="publishPatch({position: 100})">
                            <i class="fas fa-arrow-up"></i> Open
                        </button>
                        <button class="cover-btn stop" onclick="publishPatch({stop: true})">
                            <i class="fas fa-stop"></i> Stop
                        </button>
                        <button class="cover-btn close" onclick="publishPatch({position: 0})">
                            <i class="fas fa-arrow-down"></i> Close
                        </button>
                   </div>
                   <div class="position-display">
                        <div class="position-value">${position}%</div>
                   </div>
                </div>`;
        }

        if ('occupancy' in parsed) {
            const occupancy = parsed.occupancy;
            let occupancyText, occupancyClass;
            if (occupancy) {
                occupancyText = 'Motion detected';
                occupancyClass = 'occupancy-detected';
                if (devices[selectedDevice]) {
                    devices[selectedDevice].lastMotion = new Date().toISOString();
                    saveState();
                }
            } else {
                occupancyClass = 'occupancy-clear';
                if (devices[selectedDevice] && devices[selectedDevice].lastMotion) {
                    occupancyText = 'Last motion ' + timeAgo(devices[selectedDevice].lastMotion);
                } else {
                   occupancyText = 'No motion detected';
                }
            }
            controlsHtml += `
                <div class="section">Motion</div>
                <div class="row special">
                    <div class="occupancy-status ${occupancyClass}">${occupancyText}</div>
                </div>`;
        }

        if ('brightness' in parsed) {
            const v = clamp(Number(parsed.brightness) || 0, 0, 254);
            const percent = Math.round((v / 254) * 100);
            controlsHtml += `
                <div class="section">Brightness</div>
                <div class="row special">
                    <div class="brightness-display">
                        <div class="brightness-value">${percent}%</div>
                        <div class="slider-row">
                            <input type="range" min="0" max="254" value="${v}" id="brightnessSlider" class="brightness-slider">
                        </div>
                    </div>
                </div>`;
        }

        if ('color' in parsed) {
            const col = normalizeColor(parsed.color);
            controlsHtml += `
                <div class="section">Color</div>
                <div class="row special">
                    <div class="color-section">
                        <div class="color-presets">
                            <div class="color-preset" style="background: #ffffff;" onclick="setColor('#ffffff')"></div>
                            <div class="color-preset" style="background: #7852A9;" onclick="setColor('#7852A9')"></div>
                            <div class="color-preset" style="background: #0000FF;" onclick="setColor('#0000FF')"></div>
                            <div class="color-preset rainbow" onclick="setColor('rainbow')"></div>
                            <div class="color-preset" style="background: #FF0000;" onclick="setColor('#FF0000')"></div>
                        </div>
                        <div class="color-picker-container">
                            <button class="color-picker-btn" onclick="openColorPicker()">
                                🦆say▶ <i class="fas fa-palette"></i> custom color
                            </button>
                            <input type="color" id="hiddenColorPicker" style="display: none;" onchange="setColor(this.value)">
                       </div>
                    </div>
                </div>`;
        }

        const tempKey = ['color_temperature', 'color_temp', 'ct'].find(k => k in parsed);
        if (tempKey) {
            const temp = parsed[tempKey];
            controlsHtml += `
                <div class="section">Color temperature</div>
                <div class="row special">
                    <div class="color-section">
                        <div class="color-presets temperature">
                            <div class="color-preset"
                                 style="background:#e6f1ff;"
                                 onclick="setColorTemperature(9000)">
                            </div>
                            <div class="color-preset"
                                 style="background:#ffffff;"
                                 onclick="setColorTemperature(6500)">
                            </div>
                            <div class="color-preset"
                                 style="background:#ffd6a1;"
                                 onclick="setColorTemperature(4000)">
                            </div>
                            <div class="color-preset"
                                 style="background:#ffb46b;"
                                 onclick="setColorTemperature(2700)">
                            </div>
                        </div>
                    </div>
                </div>`;
        }

        rowsHtml += `<div class="section">Raw</div>`;
        for (const [key, value] of entries) {
            const lower = key.toLowerCase();
            if (lower === 'state' || lower === 'brightness' || lower === 'color') continue;
            let disp = value;
            let typeClass = 'val-string';
            let style = "";
            if (lower === 'last_seen') {
                disp = timeAgo(value);
                typeClass = "";
                style = 'color: var(--gray)';
            } else if (typeof value === 'number') {
                typeClass = 'val-number';
                style = valueColor(key, value) ? `color: ${valueColor(key, value)}` : "";
                disp = formatValue(key, value);
            } else if (typeof value === 'boolean') {
                typeClass = 'val-boolean';
            } else if (lower === 'linkquality') {
                const num = Number(value);
                const text = isFinite(num) ? linkQualityText(num) : String(value);
                const css = isFinite(num) ? valueColor('linkquality', num) : "";
                disp = text;
                style = css ? `color: ${css}` : "";
                typeClass = "";
            } else {
                disp = formatValue(key, value);
            }
            rowsHtml += `
                <div class="row">
                    <div class="key">${key}</div>
                    <div><span class="${typeClass}" style="${style}">${disp}</span></div>
                </div>`;
        }

        jsonDiv.innerHTML = controlsHtml + rowsHtml;

        jsonDiv.querySelectorAll('.device-state-toggle').forEach(toggle => {
            toggle.addEventListener('change', function() {
                const stateDisplay = this.closest('.state-display');
                const stateText = stateDisplay.querySelector('.state-text');
                const newState = this.checked ? 'ON' : 'OFF';

                stateText.textContent = newState;
                stateDisplay.classList.toggle('state-on', this.checked);
                stateDisplay.classList.toggle('state-off', !this.checked);

                sendCommand(selectedDevice, { state: newState });
            });
        });

        const bright = document.getElementById('brightnessSlider');
        const brightValue = document.querySelector('.brightness-value');
        if (bright && brightValue) {
            setRangeGradient(bright, '#000', '#ffd166');
            bright.oninput = () => {
                const v = clamp(parseInt(bright.value), 0, 255);
                const percent = Math.round((v / 255) * 100);
                brightValue.textContent = `${percent}%`;
                publishPatch({ brightness: v });
            };
        }

        const picker = document.getElementById('colorPicker');
        const preview = document.getElementById('colorPreview');
        const rS = document.getElementById('rSlider');
        const gS = document.getElementById('gSlider');
        const bS = document.getElementById('bSlider');
        const wS = document.getElementById('wSlider');
        const rB = document.getElementById('rBadge');
        const gB = document.getElementById('gBadge');
        const bB = document.getElementById('bBadge');
        const wB = document.getElementById('wBadge');

        function rgbwToHex(r, g, b, w) {
            const rA = clamp(r + w, 0, 255);
            const gA = clamp(g + w, 0, 255);
            const bA = clamp(b + w, 0, 255);
            return '#' + [rA, gA, bA].map(v => v.toString(16).padStart(2, '0')).join("");
        }

        function syncFromPicker(hex) {
            if (!rS || !gS || !bS || !wS) return;
            const m = /^#?([0-9a-f]{6})$/i.exec(hex);
            if (!m) return;
            const n = parseInt(m[1], 16);
            rS.value = (n >> 16) & 255;
            gS.value = (n >> 8) & 255;
            bS.value = n & 255;
            rB.textContent = rS.value;
            gB.textContent = gS.value;
            bB.textContent = bS.value;
            preview.style.background = rgbwToHex(+rS.value, +gS.value, +bS.value, +wS.value);
            publishPatch({ color: { r: +rS.value, g: +gS.value, b: +bS.value, w: +wS.value } });
        }

        function syncFromSliders() {
            if (!rS || !gS || !bS || !wS) return;
            rB.textContent = rS.value;
            gB.textContent = gS.value;
            bB.textContent = bS.value;
            wB.textContent = wS.value;
            const hex = rgbwToHex(+rS.value, +gS.value, +bS.value, +wS.value);
            if (picker) picker.value = hex;
            if (preview) preview.style.background = hex;
            publishPatch({ color: { r: +rS.value, g: +gS.value, b: +bS.value, w: +wS.value } });
        }

        if (picker && preview) {
            picker.oninput = () => syncFromPicker(picker.value);
        }

        [rS, gS, bS, wS].forEach(el => {
            if (el) el.oninput = syncFromSliders;
        });
    }

    async function loadInitialState() {
        try {
            const response = await fetch('/api/state');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const serverState = await response.json();
            const { ['bridge/state']: bridgeState, ...devicesState } = serverState;
            window.devices = {};
            for (const [deviceKey, data] of Object.entries(devicesState)) {
                const normalizedData = normalizeDeviceData(data);
                window.devices[deviceKey] = normalizedData;
                if (normalizedData.id) {
                    window.devices[normalizedData.id] = normalizedData;
                }
                if (!normalizedData.icon && deviceIcons[deviceKey]) {
                    normalizedData.icon = deviceIcons[deviceKey];
                }
            }
            window.deviceIdToMqttTopic = {};
            Object.entries(window.devices).forEach(([mqttTopic, deviceData]) => {
                if (deviceData.id) {
                    window.deviceIdToMqttTopic[deviceData.id] = mqttTopic;
                }
            });
            console.log('Loaded devices with icons:', Object.keys(window.devices));
            console.log('Room mappings:', window.roomDeviceMappings);
            if (window.updateAllRoomControls) {
                window.updateAllRoomControls();
            }
            if (window.syncRoomTogglesFromState) {
                window.syncRoomTogglesFromState();
            }
        } catch (error) {
            console.error('Error loading initial state:', error);
            showNotification('Using cached device data', 'info');
            return {};
        }
    }

    function normalizeDeviceData(data) {
        const normalized = { ...data };
        if (normalized.state) {
            normalized.state = String(normalized.state).toUpperCase();
        }
        if (normalized.brightness && typeof normalized.brightness === 'string') {
            normalized.brightness = parseInt(normalized.brightness, 10);
        }
        if (normalized.color && typeof normalized.color === 'string') {
            try {
                normalized.color = JSON.parse(normalized.color);
            } catch (e) {
                console.warn('Failed to parse color:', normalized.color);
            }
        }
        return normalized;
    }

    function initDashboard() {
        loadInitialState().then(() => {
            console.log('Initial state loaded, devices:', Object.keys(window.devices));
            if (window.initRoomControls) {
                initRoomControls();
            }
            setTimeout(() => {
                updateDeviceSelector();
                if (window.selectedDevice && window.devices[window.selectedDevice]) {
                    const selector = document.getElementById('deviceSelect');
                    if (selector) {
                        selector.value = window.selectedDevice;
                    }
                }
                console.log('Updating room controls from state...');
                if (window.updateAllRoomControls) {
                    updateAllRoomControls();
                }
                if (typeof syncRoomStatesAfterLoad === 'function') {
                    syncRoomStatesAfterLoad();
                }
                if (window.setInitialRoomCollapse) {
                    setInitialRoomCollapse();
                }
            }, 500);
            loadSavedState();
            navTabs.forEach((tab) => {
                tab.addEventListener('click', () => {
                    const pageIndex = parseInt(tab.getAttribute('data-page'));
                    showPage(pageIndex);
                });
            });
            document.getElementById('deviceSelect')?.addEventListener('change', function() {
                const selectedDeviceValue = this.value;
                window.selectedDevice = selectedDeviceValue;
                selectedDevice = selectedDeviceValue;
                updateDeviceUI(devices[selectedDeviceValue]);
                document.getElementById('currentDeviceName').textContent =
                  devices[selectedDeviceValue]?.friendly_name || selectedDeviceValue;
                if (!selectedDeviceValue) return;
                const deviceData = window.devices?.[selectedDeviceValue] ||
                                   devices?.[selectedDeviceValue] ||
                                   (window.devices && Object.values(window.devices).find(d => d.id === selectedDeviceValue));
                console.log('Found device data:', deviceData);
                if (deviceData) {
                    window.selectedDevice = selectedDeviceValue;
                    updateDeviceUI(deviceData);
                    showPage(1);
                    updateDeviceIcon(selectedDeviceValue);
                } else {
                    console.warn('No device data found for:', selectedDeviceValue);
                    showNotification('Device data not available', 'error');
                }
                saveState();
            });
            document.querySelectorAll('.device').forEach(device => {
                device.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const deviceName = this.getAttribute('data-device-name') ||
                                      this.querySelector('.device-name')?.textContent ||
                                      this.textContent.trim();
                    console.log(`Device clicked: ${deviceName}`);
                    const deviceData = window.devices[deviceName];
                    if (deviceData) {
                        const newState = deviceData.state === 'ON' ? 'OFF' : 'ON';
                        sendDeviceCommand(deviceName, { state: newState });
                    }
                });
            });
            document.querySelectorAll('.scene-item').forEach(scene => {
                scene.addEventListener('click', () => {
                    const sceneName = scene.getAttribute('data-scene');
                    fetch(`/api/scene/${encodeURIComponent(sceneName)}`, { method: 'POST' })
                        .then(r => r.json())
                        .then(data => console.log('Scene activated:', data));
                });
            });
            window.addEventListener('beforeunload', saveState);
        }).catch(error => {
            console.error('Failed to load initial state:', error);
            loadSavedState();
        });
        devices = window.devices;
        setInterval(() => {
          fetch('/api/state')
            .then(r => r.json())
            .then(serverState => {
              for (const [key, data] of Object.entries(serverState)) {
                devices[key] = data;
              }
              if (selectedDevice && devices[selectedDevice]) {
                updateDeviceUI(devices[selectedDevice]);
              }
              if (window.updateAllRoomControls) {
                window.updateAllRoomControls();
              }
            })
            .catch(() => {});
        }, 2500);
    }

    initDashboard();
});
