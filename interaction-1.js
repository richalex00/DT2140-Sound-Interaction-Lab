//==========================================================================================
// INTERACTION 1 — KITCHEN TIMER: SPIN THE PHONE FLAT ON THE COUNTER -> BELL
//------------------------------------------------------------------------------------------
// Use case: you are cooking with dirty hands and cannot touch the screen. The phone lies
// on the counter and works like a mechanical kitchen timer: you turn it (even with the
// back of your hand) and it clicks once per step. When you let go, it starts counting
// down, and at zero a small bell rings.
//
// Gesture: phone spun flat on a surface.
// Mapping: rotation (p5 rotationZ) -> one "tick" per STEP_DEG degrees, +1 step clockwise,
//          -1 step anticlockwise; time reaches zero -> bell rings.
// Sound: kitchenTimer.wasm (faust-dsp/Kitchen/kitchenTimer.dsp): ratchet tick + small bell.
//==========================================================================================
let dspNode = null;
let dspNodeParams = null;
let jsonParams = null;

const dspName = "kitchenTimer";
const instance = new FaustWasm2ScriptProcessor(dspName);

// output to window or npm package module
if (typeof module === "undefined") {
    window[dspName] = instance;
} else {
    const exp = {};
    exp[dspName] = instance;
    module.exports = exp;
}

kitchenTimer.createDSP(audioContext, 1024)
    .then(node => {
        dspNode = node;
        dspNode.connect(audioContext.destination);
        console.log('params: ', dspNode.getParams());
        const jsonString = dspNode.getJSON();
        jsonParams = JSON.parse(jsonString)["ui"][0]["items"];
        dspNodeParams = jsonParams;
        getMinMaxParam("/kitchenTimer/volume");       // 0..1
        getMinMaxParam("/kitchenTimer/tickVolume");   // 0..1
    });

//==========================================================================================
// TUNING — change these while testing
//==========================================================================================
const STEP_DEG = 30;          // degrees of rotation for one tick (12 steps per full turn)
const STEP_SECONDS = 10;      // time added per tick (10 s for the demo; 60 = 1 minute in real use)
const CLICK_DEG = 5;          // a soft ratchet click every few degrees, between the louder step ticks
const START_DELAY_MS = 1500;  // countdown starts when you stop turning for this long
const RING_SECONDS = 3;       // how long the bell rings at zero
const MAX_VOLUME = 0.6;       // safety cap for headphones (DSP max is 1)

let angle = 0;                // degrees turned since the last tick
let clickAngle = 0;           // degrees turned since the last soft click
let lastClick = 0;
let seconds = 0;              // time on the timer
let lastTurn = 0;             // millis() of the last tick
let running = false;
let lastSecond = 0;           // millis() of the last countdown second
let ringUntil = 0;            // millis() until which the bell is ringing
let lastRing = 0;

//==========================================================================================
// SENSOR: is the phone lying flat? (gravity almost entirely on the screen axis)
//==========================================================================================
let flat = false;
window.addEventListener("devicemotion", (e) => {
    const g = e.accelerationIncludingGravity;
    if (g && g.z !== null) flat = Math.abs(g.z) > 8;
});

let prevRotZ = null;          // last rotationZ, to compute how much the phone turned

function addStep(direction) {
    if (direction < 0 && seconds === 0) return;     // cannot go below zero
    seconds = Math.max(0, seconds + direction * STEP_SECONDS);
    running = false;                                // turning = setting, not counting
    ringUntil = 0;                                  // turning also stops the bell
    lastTurn = millis();
    tick(0.6);
}

//==========================================================================================
// INTERACTIONS (called every frame by sketch.js)
//==========================================================================================

function accelerationChange(accx, accy, accz) {
    const now = millis();

    // Start the countdown once the user stops turning
    if (!running && seconds > 0 && now - lastTurn > START_DELAY_MS) {
        running = true;
        lastSecond = now;
    }
    // Count down, with a soft tick every second like a mechanical timer
    if (running && now - lastSecond >= 1000) {
        lastSecond += 1000;
        seconds--;
        if (seconds > 0) {
            tick(0.15);
        } else {
            running = false;
            ringUntil = now + RING_SECONDS * 1000;
        }
    }
    // Bell: struck repeatedly (like the hammer of a real timer bell)
    if (now < ringUntil && now - lastRing > 120) {
        lastRing = now;
        pulse("/kitchenTimer/ring");
    }
    updateReadout();
}

function rotationChange(rotx, roty, rotz) {
    // rotz = heading of the phone around the screen axis (0..360 degrees).
    // Only count rotation while the phone lies flat on the counter.
    if (!flat || prevRotZ === null) { prevRotZ = rotz; return; }

    // Change since last frame, unwrapped across 360 -> 0 (always between -180 and +180)
    const delta = ((rotz - prevRotZ + 540) % 360) - 180;
    prevRotZ = rotz;

    // rotz grows when turning anticlockwise, so clockwise (like a real timer) = negative delta
    angle -= delta;
    let stepped = false;
    while (angle >= STEP_DEG) { angle -= STEP_DEG; addStep(+1); stepped = true; }
    while (angle <= -STEP_DEG) { angle += STEP_DEG; addStep(-1); stepped = true; }

    // Ratchet: a soft click for every small movement (CLICK_DEG), like the teeth of a real timer
    clickAngle += Math.abs(delta);
    if (clickAngle >= CLICK_DEG) {
        clickAngle = 0;
        if (!stepped && millis() - lastClick > 50) {
            lastClick = millis();
            tick(0.2);
        }
    }
}

function mousePressed() {
}

function deviceMoved() {
    movetimer = millis();
    statusLabels[2].style("color", "pink");
}

function deviceTurned() {
    threshVals[1] = turnAxis;
}

function deviceShaken() {
    shaketimer = millis();
    statusLabels[0].style("color", "pink");
}

function getMinMaxParam(address) {
    const exampleMinMaxParam = findByAddress(dspNodeParams, address);
    // ALWAYS PAY ATTENTION TO MIN AND MAX, ELSE YOU MAY GET REALLY HIGH VOLUMES FROM YOUR SPEAKERS
    const [exampleMinValue, exampleMaxValue] = getParamMinMax(exampleMinMaxParam);
    console.log(address, 'min:', exampleMinValue, 'max:', exampleMaxValue);
    return [exampleMinValue, exampleMaxValue];
}

//==========================================================================================
// AUDIO INTERACTION
//==========================================================================================

function pulse(address) {
    // Buttons need to stay at 1 for longer than one audio buffer (1024 samples ≈ 21 ms)
    if (!dspNode || audioContext.state !== 'running') return;
    dspNode.setParamValue(address, 1);
    setTimeout(() => { dspNode.setParamValue(address, 0) }, 40);
}

function tick(volume) {
    if (!dspNode) return;
    dspNode.setParamValue("/kitchenTimer/tickVolume", Math.min(MAX_VOLUME, volume));
    dspNode.setParamValue("/kitchenTimer/volume", MAX_VOLUME * 0.7);
    pulse("/kitchenTimer/tick");
}

function playAudio() {
    pulse("/kitchenTimer/ring");
}

function updateReadout() {
    // Timer display inside the description box of index.html (<p id="timerDisplay">)
    const display = document.getElementById("timerDisplay");
    if (!display) return;
    const m = Math.floor(seconds / 60);
    const s = String(seconds % 60).padStart(2, "0");
    const state = millis() < ringUntil ? "RING!" : running ? "running" : seconds > 0 ? "set" : flat ? "turn to set" : "lay the phone flat";
    display.textContent = `${m}:${s}  ${state}`;
}

//==========================================================================================
// END
//==========================================================================================
