# NOVA 1.0 — Authoritative Centralized State Machine Specification

**Milestone**: Phase B (Product Requirements & Architecture Specifications)  
**Requirement**: R2 (Authoritative 9-State FSM) & R4 (Firmware Reliability)  
**Lead Author**: `explorer_design_b1` (Product Architect & Multi-Discipline Design Specialist)  
**Firmware Implementation**: `C:\NOVA-IDF\nova_wake_test\main\nova_fsm.c` & `nova_fsm.h`  
**Test Suite Verification**: `test/test_nova_fsm.py` (9/9 passed) & `tests/e2e/tier1_features/r2_fsm_state_machine.test.ts`  
**Status**: Authoritative Architectural Standard  
**Date**: October 16, 2026  

---

## 1. Architectural Scope & Principles

The NOVA 1.0 Finite State Machine (FSM) is the single authoritative coordinator for device behavior across the entire ecosystem. It synchronizes the physical embedded hardware (ESP32-C3 RISC-V MCU), the non-blocking OLED rendering engine, the FreeRTOS audio acquisition pipeline, the cloud backend REST endpoints, and the web pairing console.

### Core Architectural Invariants
1. **Deterministic State Enclosure**: At any given microsecond, the device occupies exactly one authoritative state out of the 9 defined states.
2. **Guaranteed Deadlock Immunity**: Every active interaction state (`WAKE`, `LISTENING`, `PROCESSING`, `SUCCESS`, `ERROR`, `OFFLINE`) has a bounded, deterministic escape path back to `IDLE` or `SETUP`. No error or network loss can trap the device.
3. **Thread-Safe Mutex Concurrency**: All state evaluations, transitions, and activity timestamps are strictly protected by a dedicated FreeRTOS binary mutex (`s_fsm_mutex`).
4. **Zero Dynamic Memory Allocation**: Transitions operate entirely over statically allocated enumerations and timestamps. Zero heap allocation (`malloc`/`calloc`/`new`) occurs during state transitions.
5. **Truth-in-State Cross-Layer Reflection**: Firmware states map deterministically to backend device status (`devices.device_status`) and frontend pairing console telemetry.

---

## 2. Authoritative 9-State Taxonomy

```
+---------------------------------------------------------------------------------------------------+
|                                     NOVA 9-STATE TOPOLOGY                                         |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|           [BOOT] (0)                                                                              |
|              │                                                                                    |
|              ├─────────────── (Unconfigured: No Wi-Fi) ───────────────┐                           |
|              │                                                        ▼                           |
|              ▼ (Paired)                                         [SETUP] (1)                       |
|          ┌────────┐                                                   │                           |
|          │        │◄────────── (Pairing Success / Complete) ──────────┘                           |
|          ▼        │                                                                               |
|     ┌──────────┐  │                                                                               |
|  ┌─►│   IDLE   │──┴─────────── (Wake Word: "Hi ESP" + Offline) ───► [OFFLINE] (8)                 |
|  │  │   (2)    │                                                        │                         |
|  │  └────┬─────┘◄──────────────── (2.5s Timeout) ───────────────────────┘                         |
|  │       │                                                                                        |
|  │       ▼ (Wake Word: "Hi ESP" + Online)                                                         |
|  │  [WAKE] (3)                                                                                    |
|  │       │                                                                                        |
|  │       ▼ (1.2s Alert Glance Animation Elapsed)                                                  |
|  │  [LISTENING] (4)                                                                               |
|  │       ├─────────────────── (5-Minute Inactivity Timeout) ───────────┐                          |
|  │       │                                                             │                          |
|  │       ▼ (1.5s Speech Silence Pause Detected)                        ▼                          |
|  │  [PROCESSING] (5)                                                [IDLE]                        |
|  │       ├─── (Cloud HTTP 200 OK) ───► [SUCCESS] (6) ── (2.2s Timer) ───┤                          |
|  │       │                                                              │                          |
|  │       └─── (Cloud Error / Timeout) ─► [ERROR] (7) ── (2.2s Timer) ───┘                          |
|  │                                                                                                |
|  └────────────────────────────────────────────────────────────────────────────────────────────────┘
+---------------------------------------------------------------------------------------------------+
```

### 2.1 State Definitions

| State ID | Enum Name | Technical Purpose | Visual Representation (128×64 OLED) | Active Peripherals & Tasks |
|:---:|---|---|---|---|
| **0** | `NOVA_FSM_BOOT` | Cold hardware startup, power-on self-test (POST), ADC DMA calibration, NVS configuration load. | Transient splash: NOVA logo with boot dots. | System init, ADC continuous driver init, I2C driver init, NVS flash load. |
| **1** | `NOVA_FSM_SETUP` | Unpaired or re-configuration mode. SoftAP beaconing active; captive portal waiting for credentials. | 64×64 Micro QR Code (`https://buynovastore.vercel.app/?token=...`) with setup SSID & PIN. | Wi-Fi SoftAP mode (`NOVA-Setup-XXXX`), embedded HTTP server (port 80/443), QR rendering. |
| **2** | `NOVA_FSM_IDLE` | Paired quiescent standby state awaiting acoustic wake-word or remote cloud poll. | Expressive ambient face: soft 32×24 eyes with procedural blinks, pupil saccades, and winks. | WakeNet neural inference active (Priority 5), 16kHz ADC DMA sampling, periodic net poll. |
| **3** | `NOVA_FSM_WAKE` | Acoustic wake-word (`"Hi ESP"`) validated by WakeNet inference. Immediate user feedback. | Wide alert eyes (40×32) with circular pupils and upper eyelid lift. Duration: 1,200 ms. | Audio energy baseline capture, transition timer running, OLED alert animation. |
| **4** | `NOVA_FSM_LISTENING` | Active voice ingestion and continuous Voice Activity Detection (VAD). | Attentive eyes with 5-band dynamic audio equalizer bars reflecting speech RMS energy. | Audio chunk accumulation, energy tracking, silence duration counter, 5-min inactivity timer. |
| **5** | `NOVA_FSM_PROCESSING` | Speech pause confirmed; audio payload uploaded to cloud REST endpoint / Notion pipeline. | Concentric rotating diamonds / orbiting particle rings indicating cloud neural compute. | TLS 1.3 / HTTPS POST request in flight, mbedtls crypto engine, audio DMA buffer held. |
| **6** | `NOVA_FSM_SUCCESS` | Cloud action confirmed (HTTP 200); Notion entry written or command executed. | Cheerful happy squint eyes (`^ ^`) with 4-point radiating sparkle stars. Duration: 2,200 ms. | HTTPS session close, completion callback, display timer active. |
| **7** | `NOVA_FSM_ERROR` | Cloud timeout, network drop, speech unintelligible, or server error (HTTP 4xx/5xx). | Perplexed asymmetrical brows, drooped eyes, and exclamation mark. Duration: 2,200 ms. | Error code logging, socket reset, display timer active. |
| **8** | `NOVA_FSM_OFFLINE` | Wake word detected while disconnected from Wi-Fi, or network dropped during interaction. | Sleepy drooped eyes with crossed Wi-Fi symbol and alert icon. Duration: 2,500 ms. | Wi-Fi auto-reconnect backoff task signaled, display timer active. |

*Note on Sleep/Standby*: While in `IDLE`, after 5 minutes of total ambient silence, the OLED display driver enters low-power sleep (SSD1306 command `0xAE`, display off) to prevent OLED burn-in. The MCU remains in FreeRTOS tickless idle with ADC DMA and WakeNet actively monitoring for `"Hi ESP"`. When wake-word is detected, the display is instantly awakened (`0xAF`) and enters `WAKE`.

---

## 3. Authoritative State Transition Matrix

The table below defines every valid transition in the NOVA ecosystem. Any transition not explicitly listed is **STRICTLY INVALID** and is rejected by `nova_fsm_can_transition()`.

| Origin State (`from`) | Target State (`to`) | Trigger Event | Guard Condition | State Action / Side Effect |
|---|---|---|---|---|
| `BOOT` | `SETUP` | Boot sequence complete | NVS `wifi_ssid` key is empty or missing | Initialize SoftAP (`NOVA-Setup-XXXX`), render setup QR code. |
| `BOOT` | `IDLE` | Boot sequence complete | NVS `wifi_ssid` key present AND Wi-Fi connected | Connect to AP, initialize SNTP time, start ambient idle face loop. |
| `BOOT` | `OFFLINE` | Boot sequence complete | NVS `wifi_ssid` present BUT Wi-Fi connection fails | Start Wi-Fi reconnect timer, render offline indicator, then settle in IDLE. |
| `SETUP` | `IDLE` | Credentials received & verified | Valid SSID/PSK vaulted AND cloud bootstrap returns 200 OK | Terminate SoftAP, persist NVS credentials, transition to steady-state IDLE. |
| `SETUP` | `SUCCESS` | Web pairing claim completed | Client completes QR claim flow via web console | Render triumph animation on OLED before settling to IDLE. |
| `SETUP` | `OFFLINE` | Network failure during setup | Wi-Fi connection attempt to specified router failed | Render Wi-Fi error icon, return to SETUP with error prompt. |
| `IDLE` | `WAKE` | Wake-word validated | WakeNet returns `WAKENET_DETECTED` AND internet connected | Record `s_state_enter_time_us`, play 1.2s wake animation. |
| `IDLE` | `OFFLINE` | Wake-word validated | WakeNet returns `WAKENET_DETECTED` BUT Wi-Fi is disconnected | Display Wi-Fi exclamation icon (2.5s), alert user to lack of connection. |
| `IDLE` | `SETUP` | Factory reset or re-pair command | Long-press boot button (>5s) or cloud reset command | Clear ephemeral pairing tokens, launch SoftAP and setup QR code. |
| `IDLE` | `BOOT` | Soft reboot request | OTA update staged or manual restart commanded | Flush NVS buffers, execute `esp_restart()`. |
| `WAKE` | `LISTENING` | Wake animation complete | `time_in_state_us() >= 1,200,000` (1.2s elapsed) | Reset speech flags, start audio VAD sampling and inactivity timer. |
| `WAKE` | `OFFLINE` | Connection lost during wake | Wi-Fi link drops during alert animation | Abort listening, transition to OFFLINE alert. |
| `WAKE` | `IDLE` | User abort / cancel | False trigger detected or immediate cancel | Reset to ambient face loop. |
| `LISTENING` | `PROCESSING` | End of speech detected | `s_speech_detected_in_cycle == true` AND silence `>= 1,500,000` us | Stop recording, dispatch audio payload to HTTPS client task. |
| `LISTENING` | `IDLE` | Inactivity timeout | `now_us - s_last_activity_time_us >= 300,000,000` us (5 min) | Terminate listening session, discard partial audio, return to IDLE. |
| `LISTENING` | `ERROR` | Audio buffer error | DMA overrun or VAD processing failure | Log error code, display error expression. |
| `LISTENING` | `OFFLINE` | Network dropped | Wi-Fi disconnection detected during listening | Abort streaming, display offline alert. |
| `PROCESSING` | `SUCCESS` | Cloud ingestion successful | Serverless endpoint returns HTTP 200 with valid response | Parse Notion response, trigger triumph animation (2.2s). |
| `PROCESSING` | `ERROR` | Cloud ingestion failed | HTTP 4xx/5xx, TLS handshake timeout, or Notion API failure | Log HTTP status, trigger sad brow error animation (2.2s). |
| `PROCESSING` | `IDLE` | Cloud timeout abort | Network task times out (>15s without cloud response) | Force session release, reset HTTPS client, return to IDLE. |
| `SUCCESS` | `IDLE` | Animation elapsed | `time_in_state_us() >= 2,200,000` (2.2s elapsed) | Return to ambient idle face loop. |
| `SUCCESS` | `SETUP` | Setup claim complete | Triggered following initial provisioning claim | Enter SETUP confirmation if required by onboarding flow. |
| `ERROR` | `IDLE` | Animation elapsed | `time_in_state_us() >= 2,200,000` (2.2s elapsed) | Return to ambient idle face loop. |
| `ERROR` | `SETUP` | Terminal config error | Unrecoverable credential failure | Return to SETUP for user reconfiguration. |
| `OFFLINE` | `IDLE` | Animation elapsed | `time_in_state_us() >= 2,500,000` (2.5s elapsed) | Return to ambient idle face (Wi-Fi reconnect continues in background). |
| `OFFLINE` | `SETUP` | Setup requested | User enters setup while offline | Enter SoftAP provisioning. |

*Self-Transitions*: `can_transition(S, S) == true` is valid for all states to allow monotonic activity updates and watchdog timestamp refreshing.

---

## 4. Timeouts, Timers & Threshold Constants

All timing constants are defined in microseconds (`int64_t`) in `nova_fsm.h` and milliseconds (`number`) in TypeScript E2E test harnesses:

| Constant Identifier | Value (Microseconds) | Value (Milliseconds) | Operational Purpose |
|---|:---:|:---:|---|
| `NOVA_FSM_INACTIVITY_TIMEOUT_US` | `300,000,000 LL` | `300,000 ms` (5.0 min) | Maximum silence window in `LISTENING` before automatic return to `IDLE`. |
| `NOVA_FSM_SPEECH_SILENCE_US` | `1,500,000 LL` | `1,500 ms` (1.5 s) | Silence pause following speech required to trigger end-of-speech and move to `PROCESSING`. |
| `NOVA_FSM_WAKE_ANIM_US` | `1,200,000 LL` | `1,200 ms` (1.2 s) | Minimum duration of the alert glance animation before microphone opens for user speech. |
| `NOVA_FSM_RESULT_ANIM_US` | `2,200,000 LL` | `2,200 ms` (2.2 s) | Display duration for `SUCCESS` (sparkles) and `ERROR` (sad brows) expressions. |
| `NOVA_FSM_OFFLINE_ANIM_US` | `2,500,000 LL` | `2,500 ms` (2.5 s) | Display duration for `OFFLINE` (crossed Wi-Fi icon) alert expression. |
| `NOVA_WAKENET_COOLDOWN_US` | `2,500,000 LL` | `2,500 ms` (2.5 s) | Refractory period preventing immediate re-triggering of wake word while already processing. |
| `NOVA_VOICE_ACTIVITY_LEVEL` | `1,400 U` | — | Absolute RMS audio amplitude threshold demarcating speech from ambient background noise. |

### Inactivity & Silence Detection Logic

```c
/* Pseudocode matching main/nova_fsm.c */

void nova_fsm_touch_activity(int64_t now_us) {
    FSM_LOCK();
    s_last_activity_time_us = now_us;
    FSM_UNLOCK();
}

void nova_fsm_notify_speech_detected(int64_t now_us) {
    FSM_LOCK();
    s_speech_detected_in_cycle = true;
    s_last_speech_time_us = now_us;
    s_last_activity_time_us = now_us;  /* Ongoing speech resets the 5-minute inactivity timer */
    FSM_UNLOCK();
}

bool nova_fsm_is_inactivity_timed_out(int64_t now_us) {
    FSM_LOCK();
    if (s_current_state != NOVA_FSM_LISTENING) {
        FSM_UNLOCK();
        return false;
    }
    bool timed_out = (now_us - s_last_activity_time_us) >= NOVA_FSM_INACTIVITY_TIMEOUT_US;
    FSM_UNLOCK();
    return timed_out;
}

bool nova_fsm_is_speech_ended(int64_t now_us) {
    FSM_LOCK();
    if (s_current_state != NOVA_FSM_LISTENING || !s_speech_detected_in_cycle) {
        FSM_UNLOCK();
        return false;
    }
    bool ended = (now_us - s_last_speech_time_us) >= NOVA_FSM_SPEECH_SILENCE_US;
    FSM_UNLOCK();
    return ended;
}
```

---

## 5. Thread-Safety, Concurrency & Mutex Discipline

### 5.1 Mutex Synchronization
- State transitions are executed concurrently from multiple FreeRTOS tasks:
  - `app_main` / Audio Task (Priority 5): Triggers `IDLE -> WAKE` upon wake-word validation.
  - Audio Task (Priority 5): Calls `nova_fsm_notify_speech_detected()` upon VAD energy threshold.
  - `oled_task` (Priority 4): Evaluates animation timeouts (`time_in_state_us()`) and executes `WAKE -> LISTENING`, `SUCCESS -> IDLE`, `ERROR -> IDLE`.
  - `net_sync_task` (Priority 3): Executes `LISTENING -> PROCESSING`, `PROCESSING -> SUCCESS`, `PROCESSING -> ERROR`.
  - Wi-Fi Event Handler (Priority 2): Executes `* -> OFFLINE` upon `WIFI_EVENT_STA_DISCONNECTED`.
- **Protection Mechanism**: All state transitions and timestamp modifications are enclosed by `FSM_LOCK()` / `FSM_UNLOCK()` macros backed by `s_fsm_mutex = xSemaphoreCreateMutex()`.
- **Zero Inversion Deadlock**: Mutex hold times are microsecond-scale (pure register comparisons and assignment). No I/O, I2C bus transactions, or network calls are EVER performed inside `FSM_LOCK()`.
- **Callback Inversion Protection**: As seen in `nova_fsm.c:141-147`, the optional transition callback `s_transition_cb` is invoked **AFTER** `FSM_UNLOCK()`, guaranteeing that callback consumers can never cause recursive deadlock.

---

## 6. Cross-Layer Ecosystem State Reconciliation

To guarantee consistency across the physical device, database records, and web browser, the table below maps internal firmware states to backend schema states and frontend UI presentation:

| Authoritative Firmware FSM State | Supabase `devices.device_status` | Web Frontend Presentation (`SetupExperience.tsx`) | Physical Visual Indication |
|---|---|---|---|
| `NOVA_FSM_BOOT` | `'booting'` | "Device starting up..." (Neutral badge) | Splash dots |
| `NOVA_FSM_SETUP` | `'provisioning'` | "Waiting for setup / scanning QR code" (Cyan pulse badge) | 64×64 Pairing QR Code |
| `NOVA_FSM_IDLE` | `'idle'` | "Online & Ready" (Green status badge) | Ambient animated face |
| `NOVA_FSM_WAKE` | `'waking'` | "Wake word detected!" (Bright cyan badge) | Alert glance eyes (1.2s) |
| `NOVA_FSM_LISTENING` | `'listening'` | "Listening to voice input..." (Audio wave badge) | Dynamic equalizer bars |
| `NOVA_FSM_PROCESSING`| `'processing'` | "Transcribing & syncing to Notion..." (Amber badge) | Rotating diamonds |
| `NOVA_FSM_SUCCESS` | `'success'` | "Notion page updated successfully!" (Emerald badge) | Sparkle stars (`^ ^`) |
| `NOVA_FSM_ERROR` | `'error'` | "Sync failed — check network" (Rose red badge) | Sad brow / exclamation |
| `NOVA_FSM_OFFLINE` | `'offline'` | "Device offline — Wi-Fi disconnected" (Slate grey badge) | Crossed Wi-Fi icon |

---

## 7. Formal Mathematical Invariants & Verification Proofs

1. **Safety Invariant $I_1$ (Invalid Transitions Blocked)**:
   $$\forall s_1, s_2 \in \text{States}: \text{can\_transition}(s_1, s_2) = \text{false} \implies \text{transition}(s_2) = \text{ESP\_ERR\_INVALID\_STATE}$$
   *Proof*: Directly verified by `test_invalid_transitions_rejected` in `test_nova_fsm.py` and Vitest test `T1-R2-05`. Transitions from `BOOT` directly to `PROCESSING`, `LISTENING`, or `SUCCESS` return `false` without state change.

2. **Liveness Invariant $I_2$ (Deterministic Inactivity Escape)**:
   $$\forall t \ge 300{,}000{,}000\,\mu\text{s}: (\text{state} = \text{LISTENING} \land \text{silence}) \implies \text{transition}(\text{IDLE}) = \text{true}$$
   *Proof*: Directly verified by Vitest test `T2-R4-01` and Python test `test_five_minute_inactivity_timeout_in_listening`. At $t = 299{,}999\,\text{ms}$, timeout is false; at $t = 300{,}000\,\text{ms}$, timeout triggers cleanly to `IDLE`.

3. **Idempotency Invariant $I_3$ (Rapid Wake Re-triggering)**:
   $$\text{state} = \text{LISTENING} \implies \text{triggerWakeWord}() = \text{false} \land \text{state} = \text{LISTENING}$$
   *Proof*: Directly verified by Vitest test `T2-R2-01`. Rapid repeated wake detections while already listening do not reset the state machine or trigger allocation leaks.

4. **Credential Preservation Invariant $I_4$**:
   $$\text{state} \xrightarrow{\text{OFFLINE}} \text{SETUP} \implies \text{NVS}[\text{"wifi\_ssid"}] = \text{preserved}$$
   *Proof*: Directly verified by Vitest test `T2-R2-05`. Entering setup from offline state preserves stored Wi-Fi and device identity credentials without premature erasure.
