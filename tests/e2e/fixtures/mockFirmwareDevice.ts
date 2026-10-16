/**
 * Stateful Hardware & Firmware Emulator for ESP32-C3 / SSD1306 / MAX4466
 * Derived strictly from:
 * - C:\NOVA-IDF\nova_wake_test\main\nova_fsm.c & nova_fsm.h
 * - C:\NOVA-IDF\nova_wake_test\main\nova_state.h
 * - ORIGINAL_REQUEST.md Requirements R3 & R4
 */

export type FSMState =
  | 'BOOT'
  | 'SETUP'
  | 'IDLE'
  | 'WAKE'
  | 'LISTENING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'ERROR'
  | 'OFFLINE';

export type OledPrimitive =
  | 'idle'
  | 'blink'
  | 'wink'
  | 'wake'
  | 'listening'
  | 'processing'
  | 'success'
  | 'offline'
  | 'error'
  | 'pairing_qr';

export class OledDisplayBuffer {
  public static readonly WIDTH = 128;
  public static readonly HEIGHT = 64;
  public static readonly BUFFER_SIZE = (128 * 64) / 8; // 1024 bytes (8 pages of 128 bytes)

  private buffer: Uint8Array = new Uint8Array(OledDisplayBuffer.BUFFER_SIZE);
  public currentPrimitive: OledPrimitive = 'idle';
  public lastRenderDurationMs: number = 0;
  public renderCount: number = 0;

  public clear(): void {
    this.buffer.fill(0);
  }

  public getRawBuffer(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  public setPixel(x: number, y: number, color: 0 | 1): boolean {
    if (x < 0 || x >= OledDisplayBuffer.WIDTH || y < 0 || y >= OledDisplayBuffer.HEIGHT) {
      return false; // Out of bounds pixel rejected cleanly
    }
    const page = Math.floor(y / 8);
    const bit = y % 8;
    const index = page * OledDisplayBuffer.WIDTH + x;
    if (color === 1) {
      this.buffer[index] |= (1 << bit);
    } else {
      this.buffer[index] &= ~(1 << bit);
    }
    return true;
  }

  public getPixel(x: number, y: number): 0 | 1 {
    if (x < 0 || x >= OledDisplayBuffer.WIDTH || y < 0 || y >= OledDisplayBuffer.HEIGHT) {
      return 0;
    }
    const page = Math.floor(y / 8);
    const bit = y % 8;
    const index = page * OledDisplayBuffer.WIDTH + x;
    return (this.buffer[index] & (1 << bit)) !== 0 ? 1 : 0;
  }

  public renderExpression(primitive: OledPrimitive): { success: boolean; durationMs: number } {
    const startTime = Date.now();
    this.clear();
    this.currentPrimitive = primitive;

    // Draw eye primitives on 128x64 display
    switch (primitive) {
      case 'idle':
        // Left eye box 32x24 at (20, 20), Right eye box 32x24 at (76, 20)
        this.drawBox(20, 20, 32, 24);
        this.drawBox(76, 20, 32, 24);
        break;
      case 'blink':
        // Closed horizontal slits
        this.drawLine(20, 32, 52, 32);
        this.drawLine(76, 32, 108, 32);
        break;
      case 'wink':
        this.drawBox(20, 20, 32, 24);
        this.drawLine(76, 32, 108, 32);
        break;
      case 'wake':
      case 'listening':
        // Enlarged circular eyes + soundwave ticks
        this.drawBox(16, 16, 40, 32);
        this.drawBox(72, 16, 40, 32);
        for (let i = 0; i < 5; i++) {
          this.drawLine(58 + i * 3, 24 - i * 2, 58 + i * 3, 40 + i * 2);
        }
        break;
      case 'processing':
        // Rotating spinner pixels
        this.drawBox(24, 24, 24, 24);
        this.drawBox(80, 24, 24, 24);
        break;
      case 'success':
        // Upward curved happy eyes (^_^)
        this.drawLine(20, 36, 36, 24);
        this.drawLine(36, 24, 52, 36);
        this.drawLine(76, 36, 92, 24);
        this.drawLine(92, 24, 108, 36);
        break;
      case 'offline':
      case 'error':
        // Cross X eyes (X_X)
        this.drawLine(24, 24, 48, 48);
        this.drawLine(24, 48, 48, 24);
        this.drawLine(80, 24, 104, 48);
        this.drawLine(80, 48, 104, 24);
        break;
      case 'pairing_qr':
        this.drawQrPattern(32, 0, 64);
        break;
    }

    this.renderCount++;
    this.lastRenderDurationMs = Math.max(1, Date.now() - startTime);
    return { success: true, durationMs: this.lastRenderDurationMs };
  }

  public drawBox(x: number, y: number, w: number, h: number): void {
    for (let px = x; px < x + w; px++) {
      for (let py = y; py < y + h; py++) {
        this.setPixel(px, py, 1);
      }
    }
  }

  public drawLine(x0: number, y0: number, x1: number, y1: number): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let cx = x0;
    let cy = y0;
    while (true) {
      this.setPixel(cx, cy, 1);
      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }
  }

  public drawQrPattern(startX: number, startY: number, size: number): void {
    // Generate deterministic high-contrast finder patterns and QR data matrix
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        // 7x7 corner finder patterns
        const inTopLeftFinder = (i < 7 && j < 7);
        const inTopRightFinder = (i >= size - 7 && j < 7);
        const inBottomLeftFinder = (i < 7 && j >= size - 7);

        if (inTopLeftFinder || inTopRightFinder || inBottomLeftFinder) {
          const border = (i === 0 || i === 6 || j === 0 || j === 6 ||
                         i === size - 7 || i === size - 1 || j === size - 7 || j === size - 1);
          const center = ((i >= 2 && i <= 4) && (j >= 2 && j <= 4));
          this.setPixel(startX + i, startY + j, (border || center) ? 1 : 0);
        } else {
          // Data bits based on coordinates
          const isBlack = ((i + j) % 2 === 0) ? 1 : 0;
          this.setPixel(startX + i, startY + j, isBlack);
        }
      }
    }
  }
}

export class MockNvsPartition {
  private storage: Map<string, string> = new Map();
  private outboxQueue: Array<{ id: string; type: string; payload: string }> = [];

  public get(key: string): string | null {
    return this.storage.get(key) || null;
  }

  public set(key: string, value: string): void {
    this.storage.set(key, value);
  }

  public remove(key: string): void {
    this.storage.delete(key);
  }

  public clear(): void {
    this.storage.clear();
    this.outboxQueue = [];
  }

  public enqueue(type: string, payload: string): string {
    const id = `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.outboxQueue.push({ id, type, payload });
    return id;
  }

  public peekQueue(): { id: string; type: string; payload: string } | null {
    return this.outboxQueue.length > 0 ? this.outboxQueue[0] : null;
  }

  public ackQueue(id: string): boolean {
    const idx = this.outboxQueue.findIndex(item => item.id === id);
    if (idx !== -1) {
      this.outboxQueue.splice(idx, 1);
      return true;
    }
    return false;
  }

  public getQueueCount(): number {
    return this.outboxQueue.length;
  }
}

export class MockFirmwareDevice {
  public readonly deviceId: string;
  public readonly macAddress: string;
  public readonly serialNumber: string;

  public state: FSMState = 'BOOT';
  public oled: OledDisplayBuffer = new OledDisplayBuffer();
  public nvs: MockNvsPartition = new MockNvsPartition();

  public isWifiConnected: boolean = false;
  public currentSsid: string | null = null;
  public currentRssi: number = -60;
  public isSoftApActive: boolean = false;

  public stateEnterTimeMs: number = Date.now();
  public lastActivityTimeMs: number = Date.now();
  public inactivityTimeoutMs: number = 300000; // 5 minutes (300,000 ms)
  public audioSampleRate: number = 16000; // 16 kHz

  // Hardware safety assertions
  public attemptedSpeakerAccess: boolean = false;
  public attemptedRgbLedAccess: boolean = false;
  public attemptedVibrationMotorAccess: boolean = false;

  constructor(deviceId: string = 'nova-c3-5c20dc4239fca9ec', macAddress: string = '48:F6:EE:17:34:D8') {
    this.deviceId = deviceId;
    this.macAddress = macAddress;
    this.serialNumber = `NOVA-C3-${deviceId.replace('nova-c3-', '').toUpperCase()}`;

    // Initialize factory identity into NVS
    this.nvs.set('device_id', this.deviceId);
    this.nvs.set('mac_addr', this.macAddress);
    this.nvs.set('bootstrap_secret', 'mock_bootstrap_secret_hex_64_bytes');
  }

  public boot(): void {
    this.state = 'BOOT';
    this.stateEnterTimeMs = Date.now();
    this.lastActivityTimeMs = this.stateEnterTimeMs;
    this.oled.renderExpression('idle');

    const defaultSsid = this.nvs.get('wifi_ssid');
    if (defaultSsid) {
      this.transitionTo('IDLE');
      this.isWifiConnected = true;
      this.currentSsid = defaultSsid;
    } else {
      this.transitionTo('SETUP');
      this.isSoftApActive = true;
      this.oled.renderExpression('pairing_qr');
    }
  }

  public canTransition(to: FSMState): boolean {
    const from = this.state;
    if (from === to) return true;

    switch (from) {
      case 'BOOT':
        return to === 'SETUP' || to === 'IDLE' || to === 'OFFLINE';
      case 'SETUP':
        return to === 'IDLE' || to === 'SUCCESS' || to === 'OFFLINE';
      case 'IDLE':
        return to === 'WAKE' || to === 'OFFLINE' || to === 'SETUP' || to === 'BOOT';
      case 'WAKE':
        return to === 'LISTENING' || to === 'OFFLINE' || to === 'IDLE';
      case 'LISTENING':
        return to === 'PROCESSING' || to === 'IDLE' || to === 'ERROR' || to === 'OFFLINE';
      case 'PROCESSING':
        return to === 'SUCCESS' || to === 'ERROR' || to === 'IDLE';
      case 'SUCCESS':
      case 'ERROR':
      case 'OFFLINE':
        return to === 'IDLE' || to === 'SETUP';
      default:
        return false;
    }
  }

  public transitionTo(to: FSMState): boolean {
    if (!this.canTransition(to)) {
      return false;
    }
    this.state = to;
    this.stateEnterTimeMs = Date.now();
    this.lastActivityTimeMs = this.stateEnterTimeMs;

    // Synchronize OLED animation expression
    switch (to) {
      case 'IDLE':
        this.oled.renderExpression('idle');
        break;
      case 'WAKE':
        this.oled.renderExpression('wake');
        break;
      case 'LISTENING':
        this.oled.renderExpression('listening');
        break;
      case 'PROCESSING':
        this.oled.renderExpression('processing');
        break;
      case 'SUCCESS':
        this.oled.renderExpression('success');
        break;
      case 'ERROR':
        this.oled.renderExpression('error');
        break;
      case 'OFFLINE':
        this.oled.renderExpression('offline');
        break;
      case 'SETUP':
        this.oled.renderExpression('pairing_qr');
        break;
    }
    return true;
  }

  public triggerWakeWord(): boolean {
    if (this.state !== 'IDLE') {
      return false;
    }
    const wakeOk = this.transitionTo('WAKE');
    if (wakeOk) {
      // Immediately transition to LISTENING
      return this.transitionTo('LISTENING');
    }
    return false;
  }

  public checkInactivityTimeout(nowMs: number = Date.now()): boolean {
    if (this.state === 'LISTENING') {
      if (nowMs - this.lastActivityTimeMs >= this.inactivityTimeoutMs) {
        this.transitionTo('IDLE');
        return true;
      }
    }
    return false;
  }

  public disconnectWifi(): void {
    this.isWifiConnected = false;
    this.currentSsid = null;
    this.currentRssi = 0;
    this.transitionTo('OFFLINE');
  }

  public reconnectWifi(ssid: string, rssi: number = -55): boolean {
    this.currentSsid = ssid;
    this.currentRssi = rssi;
    this.isWifiConnected = true;
    return this.transitionTo('IDLE');
  }

  // Safety boundaries: Ensure test verifies no non-existent peripherals are triggered
  public invokeSpeakerTone(): void {
    this.attemptedSpeakerAccess = true;
    throw new Error('HARDWARE_VIOLATION: No speaker peripheral exists on NOVA 1.0 hardware.');
  }

  public invokeRgbLed(): void {
    this.attemptedRgbLedAccess = true;
    throw new Error('HARDWARE_VIOLATION: No RGB LED exists on NOVA 1.0 hardware.');
  }

  public invokeHapticVibration(): void {
    this.attemptedVibrationMotorAccess = true;
    throw new Error('HARDWARE_VIOLATION: No vibration motor exists on NOVA 1.0 hardware.');
  }
}
