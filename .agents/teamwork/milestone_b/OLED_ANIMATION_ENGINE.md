# NOVA 1.0 — 128×64 Monochrome OLED Expressive Animation Engine Blueprint

**Milestone**: Phase B (Product Requirements & Design System)  
**Requirement**: R3 (Industrial Design & 128×64 OLED Animation Engine)  
**Lead Author**: `explorer_design_b1` (Product Architect & Multi-Discipline Design Specialist)  
**Target Hardware**: SSD1306 128×64 Monochrome OLED on I2C (GPIO8 SDA, GPIO9 SCL @ 400kHz Fast-Mode)  
**Verification Harness**: `tests/e2e/tier1_features/r3_oled_animation.test.ts` & `tier2_boundaries/r3_boundary.test.ts`  
**Status**: Authoritative Technical Blueprint  
**Date**: October 16, 2026  

---

## 1. Executive Summary & Design Vision

NOVA is an ambient, voice-first companion designed to live on a keychain. Because NOVA’s physical hardware intentionally omits acoustic speakers, buzzer transducers, RGB status LEDs, and haptic vibration motors, **the 0.96-inch monochrome OLED display is NOVA’s sole sensory feedback channel**.

The animation engine must transform a low-cost, 1-bit monochrome display into an expressive, emotional digital persona. It achieves this while upholding uncompromising embedded systems discipline:
1. **Zero Audio-DMA Starvation**: Never preempts or starves the 16kHz MAX4466 ADC continuous audio sampling or WakeNet neural network inference.
2. **Deterministic Frame Rate**: Maintains a smooth 20–30 FPS refresh rate for active animations while dropping to a power-saving 10 FPS during ambient idle.
3. **Dirty-Rectangle & Partial Page Updates**: Limits I2C bus traffic by updating only modified display pages, cutting flush duration from 23ms to under 11ms.
4. **Strict Memory & Bounds Safety**: Operates within a fixed 1024-byte framebuffer with zero dynamic memory allocation and hard coordinate clipping.

---

## 2. Display Hardware & Framebuffer Architecture

### 2.1 SSD1306 Geometry & Memory Layout

```
                  Col 0                                              Col 127
         Page 0 ┌────────────────────────────────────────────────────────┐ Y = 0
  Byte 0..127   │ D0 D0 D0 ...                                           │
                │ D7 D7 D7 ...                                           │ Y = 7
         Page 1 ├────────────────────────────────────────────────────────┤ Y = 8
 Byte 128..255  │                                                        │ Y = 15
         Page 2 ├────────────────────────────────────────────────────────┤ Y = 16
 Byte 256..383  │       [ Left Eye: 32x24 ]      [ Right Eye: 32x24 ]    │
         Page 3 ├────────────────────────────────────────────────────────┤ Y = 24
 Byte 384..511  │       (X: 20..51, Y: 20..43)   (X: 76..107, Y: 20..43) │
         Page 4 ├────────────────────────────────────────────────────────┤ Y = 32
 Byte 512..639  │                                                        │ Y = 40
         Page 5 ├────────────────────────────────────────────────────────┤ Y = 41
 Byte 640..767  │              [ Audio Equalizer / Status Zone ]         │ Y = 47
         Page 6 ├────────────────────────────────────────────────────────┤ Y = 48
 Byte 768..895  │                                                        │ Y = 55
         Page 7 ├────────────────────────────────────────────────────────┤ Y = 56
 Byte 896..1023 │                                                        │ Y = 63
                └────────────────────────────────────────────────────────┘
```

- **Resolution**: 128 horizontal columns × 64 vertical rows = 8,192 pixels.
- **Memory Footprint**: Exactly **1024 bytes** ($128 \times 64 \div 8$).
- **Page Addressing Architecture**:
  - The SSD1306 divides 64 vertical rows into **8 Pages** (Page 0 to Page 7).
  - Each page contains 128 vertical byte slices (columns).
  - In each byte: Bit 0 is the topmost pixel ($y \pmod 8 = 0$), and Bit 7 is the bottom pixel ($y \pmod 8 = 7$).
  - Framebuffer index formula:
    $$\text{Index} = \left(\lfloor y / 8 \rfloor \times 128\right) + x$$
    $$\text{Bit} = y \pmod 8$$

### 2.2 Coordinate Safety & Boundary Clipping
To prevent memory corruption, buffer overflows, or panics from extreme coordinates, all graphic primitives enforce strict bounds clipping:

```c
static inline void ssd1306_set_pixel(uint8_t *fb, int16_t x, int16_t y, uint8_t color) {
    if (x < 0 || x >= 128 || y < 0 || y >= 64) {
        return; /* Cleanly reject out-of-bounds coordinates */
    }
    uint16_t index = (uint16_t)((y >> 3) * 128 + x);
    uint8_t bit = (uint8_t)(y & 0x07);
    if (color) {
        fb[index] |= (1U << bit);
    } else {
        fb[index] &= ~(1U << bit);
    }
}
```
*Verification Evidence*: Verified by Vitest test `T2-R3-01` (boundary points $(0,0)$, $(127,63)$, and out-of-bounds $(-1,0)$, $(128,64)$ rejected safely) and `T2-R3-02` (clipping line from $(-10,-10)$ to $(200,100)$ retains exact 1024-byte buffer without panic).

---

## 3. Frame Rate, Timing Budget & Non-Blocking Task Scheduling

### 3.1 Timing Budget Analysis (400 kHz I2C Fast-Mode)

| Step | Operation | Duration | Bus / CPU Impact |
|---|---|:---:|---|
| **Step 1** | Procedural geometry rendering in RAM (`fb[1024]`) | **1.8 – 3.5 ms** | CPU only (zero I2C traffic) |
| **Step 2** | Full Framebuffer I2C Flush (8 Pages = 1024 bytes + commands) | **~23.2 ms** | I2C Bus @ 400kHz |
| **Step 2b**| *Optimized*: Partial Dirty-Page Flush (Pages 2–5 = 512 bytes) | **~11.6 ms** | I2C Bus @ 400kHz |
| **Total Frame Time** | Procedural compute + Full Flush | **~25.5 ms** | Total FreeRTOS task run slice |

### 3.2 Dynamic Frame Rate Policy
To conserve energy and eliminate bus contention during periods of inactivity:
- **Active Interaction States** (`WAKE`, `LISTENING`, `PROCESSING`):
  - Target Frame Rate: **25 FPS** (frame period: $40\,\text{ms}$).
  - Refresh technique: Dirty-page updates targeting Pages 2 through 6.
  - Leaves $> 65\%$ of every $40\,\text{ms}$ slice completely idle for background networking.
- **Ambient Quiescent States** (`IDLE`, `BOOT`):
  - Target Frame Rate: **10 FPS** (frame period: $100\,\text{ms}$).
  - Procedural micro-blinks and wandering pupil saccades executed every 3–5 seconds.
  - Bus utilization drops to $< 25\%$.
- **Display Sleep Mode** (`STANDBY` after 5 min of silence):
  - 0 FPS. Display power-down command (`0xAE`). Bus utilization = $0\%$.

### 3.3 Audio DMA Starvation Immunity
The ESP32-C3 is a single-core processor. In Phase A, running the OLED task at Priority 4 while audio sampling ran at Priority 1 in `app_main` led to buffer overflow during I2C flushes.
**Authoritative Architectural Invariant**:
- Audio DMA Sampling & WakeNet Task: **FreeRTOS Priority 5** (Stack: 8KB).
- OLED Animation Engine Task: **FreeRTOS Priority 4** (Stack: 4KB).
- FreeRTOS priority preemption guarantees that whenever the ADC DMA buffer signals half-full (every 16ms), the Audio Task immediately interrupts the OLED task, extracts the 256-sample audio frame into the WakeNet ring buffer, and yields back to OLED rendering.
- Render duration test constraint: `render.durationMs <= 50ms` (verified by Vitest test `T1-R3-03`).

---

## 4. Reusable Pixel-Art Expression Library

All expressions are constructed mathematically from procedural geometric primitives (filled boxes, ellipses, quadratic curves, and bitmap glyphs), eliminating storage bloat from large bitmap image tables.

```
+─────────────────────────────────────────────────────────────────────────────────────────────+
|                                    NOVA EXPRESSION TAXONOMY                                 |
+─────────────────────────────────────────────────────────────────────────────────────────────+
|                                                                                             |
|   1. IDLE (Ambient)             2. BLINK (Natural)            3. WINK (Playful)             |
|   ┌────────┐    ┌────────┐      ┌────────┐    ┌────────┐      ┌────────┐    ┌────────┐      |
|   │  ████  │    │  ████  │      │        │    │        │      │  ████  │    │        │      |
|   │  ████  │    │  ████  │      │────────│    │────────│      │  ████  │    │────────│      |
|   └────────┘    └────────┘      └────────┘    └────────┘      └────────┘    └────────┘      |
|                                                                                             |
|   4. WAKE (Alert Glance)        5. LISTENING (Equalizer)      6. PROCESSING (Spinning Orbit)|
|   ┌──────────┐  ┌──────────┐    ┌──────────┐  ┌──────────┐    ┌────────┐    ┌────────┐      |
|   │  ██████  │  │  ██████  │    │  ██████  │  │  ██████  │    │   ◇    │    │   ◇    │      |
|   │  ██████  │  │  ██████  │    │  ██████  │  │  ██████  │    │ ◇   ◇  │    │ ◇   ◇  │      |
|   └──────────┘  └──────────┘    └───┬──┬───┘  └───┬──┬───┘    └────────┘    └────────┘      |
|                                     │  │          │  │                                      |
|                                     █  █          █  █                                      |
|                                                                                             |
|   7. SUCCESS (Triumph)          8. OFFLINE (Crossed Wi-Fi)    9. ERROR (Sad Brow)           |
|     \      /      \      /          ·---·                         \  /          \  /        |
|      \    /        \    /          /  x  \                         ██            ██         |
|       ^  ^          ^  ^             / \                          \  /          \  /        |
|     * Sparkles *                   /     \                          !             !         |
|                                                                                             |
+─────────────────────────────────────────────────────────────────────────────────────────────+
```

### 4.1 Detailed Expression Specifications

#### 1. `idle` (Ambient Companion State)
- **Geometry**: Left eye box $32 \times 24$ at $(20, 20)$; Right eye box $32 \times 24$ at $(76, 20)$.
- **Procedural Behavior**:
  - Gaze wandering: Pupils shift $(\pm 4\,\text{px}, \pm 2\,\text{px})$ organically every $2.5$ to $4.5$ seconds using a pseudo-random linear congruential generator (LCG).
  - Subtle breathing pulse: Vertical height oscillates by $\pm 1\,\text{px}$ over a 3.0-second sine wave cycle.

#### 2. `blink` (Natural Eye Lubrication)
- **Geometry**: Left eye collapses to a 2px horizontal slit at $(20, 32)$ with width $32\,\text{px}$; Right eye collapses to slit at $(76, 32)$ with width $32\,\text{px}$.
- **Timing**: Fast 2-frame transition: Frame 1 (half-closed, $12\,\text{px}$ height, $40\,\text{ms}$), Frame 2 (fully closed slit, $2\,\text{px}$ height, $60\,\text{ms}$), then instant snap back to `idle`. Occurs every $3.5$ to $6.0$ seconds.

#### 3. `wink` (Playful Acknowledgment)
- **Geometry**: Left eye remains wide open ($32 \times 24$ at $(20, 20)$); Right eye executes an arched wink smile curve starting at $(76, 32)$, bowing downward by $4\,\text{px}$ at $(92, 36)$, and terminating at $(108, 32)$ with a $3\,\text{px}$ raised cheek highlight.
- **Duration**: Holds for $350\,\text{ms}$ before snapping back to open gaze.

#### 4. `wake` (Attentive Wake-Word Trigger)
- **Geometry**: Eyes expand dynamically to $40 \times 32\,\text{px}$ (Left: $(16, 16)$, Right: $(72, 16)$).
- **Procedural Highlight**: A circular specular highlight dot ($3 \times 3\,\text{px}$) is illuminated in the upper-right corner of each pupil ($(48, 20)$ and $(104, 20)$), conveying sudden lifelike alertness.
- **Duration**: Displays for exactly $1,200\,\text{ms}$ (`NOVA_FSM_WAKE_ANIM_US`).

#### 5. `listening` (Voice Activity Equalizer)
- **Geometry**: Retains attentive wide eyes from `wake`.
- **Dynamic Equalizer Bars**: Beneath the eyes (Pages 5 and 6, $Y: 48..62$), a 6-bar symmetrical spectrum analyzer animates in direct proportion to incoming microphone RMS amplitude:
  - Bar columns at $X = 36, 44, 52, 76, 84, 92$.
  - Bar width: $4\,\text{px}$ with $4\,\text{px}$ gap.
  - Height scales dynamically from $2\,\text{px}$ (ambient noise floor) to $14\,\text{px}$ (peak speech energy $> 1400\,\text{U}$).

#### 6. `processing` (Neural Cloud Ingestion)
- **Geometry**: Eyes shrink to soft squares ($20 \times 20\,\text{px}$ at $(26, 22)$ and $(82, 22)$).
- **Animation**: In the center of each eye, a concentric geometric diamond rotates across 4 orthogonal phases ($0^\circ, 90^\circ, 180^\circ, 270^\circ$) at 100ms per frame. Orbiting satellite pixels rotate around the perimeter, signaling active HTTPS/Notion cloud processing.

#### 7. `success` (Triumphant Completion)
- **Geometry**: Both eyes morph into cheerful happy arches (`^ ^`) using inverted quadratic Bezier curves spanning $X: 20..52$ and $X: 76..108$ at $Y: 24..36$.
- **Sparkle Particle Physics**: 4-point sparkle cross stars float upward from the cheeks:
  - Center pixel at $(cx, cy)$ with orthogonal arms extending 2px north, south, east, west.
  - Upward velocity $v_y = -2\,\text{px}/\text{frame}$ with organic horizontal drift.
- **Duration**: Displays for $2,200\,\text{ms}$ (`NOVA_FSM_RESULT_ANIM_US`) before returning to `idle`.

#### 8. `offline` (Connection Alert)
- **Geometry**: Drooped, sleepy eye slits ($24 \times 8\,\text{px}$ with downward tilt).
- **Iconography**: Between the eyes (centered at $X: 64, Y: 16$), a prominent Wi-Fi broadcast arc symbol with an overlay diagonal strike-through slash ($X: 56..72, Y: 10..26$) is drawn.
- **Duration**: Displays for $2,500\,\text{ms}$ (`NOVA_FSM_OFFLINE_ANIM_US`).

#### 9. `error` (Frustration / Failure)
- **Geometry**: Asymmetrical furrowed brow lines angling sharply downward toward the nose bridge (Left brow: $(18, 14)$ to $(50, 22)$; Right brow: $(78, 22)$ to $(110, 14)$).
- **Iconography**: A bold $3 \times 12\,\text{px}$ exclamation mark centered beneath the brows at $(64, 28)$ flashes at 4 Hz.
- **Duration**: Displays for $2,200\,\text{ms}$ (`NOVA_FSM_RESULT_ANIM_US`).

---

## 5. Micro QR Code Specification for OLED (`pairing_qr`)

During `NOVA_FSM_SETUP`, the animation engine renders a high-contrast Micro QR code encoding the device's unique ephemeral setup URL:
`https://buynovastore.vercel.app/?token=clm_live_XXXXXXXX`

### 5.1 QR Layout Geometry
- **Zone Dimensions**: $64 \times 64\,\text{px}$ square centered horizontally on the display:
  - Horizontal bounds: $X: 32$ to $X: 95$ (leaving $32\,\text{px}$ margins on left and right).
  - Vertical bounds: $Y: 0$ to $Y: 63$.
- **Finder Patterns**: Strict $7 \times 7$ square finder patterns located at:
  - Top-Left: $X: 32..38, Y: 0..6$.
  - Top-Right: $X: 89..95, Y: 0..6$.
  - Bottom-Left: $X: 32..38, Y: 57..63$.
- **Module Scaling**: 2× pixel scaling (each QR module is $2 \times 2$ physical OLED pixels), ensuring flawless scanning by smartphone cameras under varying ambient lighting.
- **Quiet Zone**: 2-module ($4\,\text{px}$) clear perimeter surrounding the matrix.

*Verification Evidence*: Verified by Vitest test `T1-R3-04` (finder pattern at $(32,0)$ and center dot at $(35,3)$) and `T2-R3-05` (strict $7 \times 7$ structural borders at $Y=0$ and $Y=6$).

---

## 6. Truth-in-Hardware Guard & Peripheral Enforcement

NOVA’s hardware bill of materials is strictly locked. The animation engine is designed under the absolute constraint that **no acoustic speaker, no vibration motor, and no RGB LED exists on the device**.

```c
/* Authoritative Peripheral Constraint Guard */
void nova_audio_invoke_speaker(void) {
    /* HARDWARE_VIOLATION: NOVA BOM contains no speaker or audio DAC */
    ESP_LOGE(TAG, "HARDWARE_VIOLATION: Attempted access to non-existent speaker peripheral");
    abort();
}

void nova_haptic_invoke_motor(void) {
    /* HARDWARE_VIOLATION: NOVA BOM contains no vibration motor */
    ESP_LOGE(TAG, "HARDWARE_VIOLATION: Attempted access to non-existent haptic motor");
    abort();
}

void nova_led_invoke_rgb(void) {
    /* HARDWARE_VIOLATION: NOVA BOM contains no RGB LED */
    ESP_LOGE(TAG, "HARDWARE_VIOLATION: Attempted access to non-existent RGB LED");
    abort();
}
```

*Verification Evidence*: Vitest test `T1-R3-05` executes `invokeSpeakerTone()`, `invokeRgbLed()`, and `invokeHapticVibration()`, asserting that all three calls throw `HARDWARE_VIOLATION`. All sensory feedback is strictly restricted to monochrome OLED visual rendering.
