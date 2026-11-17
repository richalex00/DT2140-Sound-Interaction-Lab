//==========================================================================================
// INTERACTION 4 — KNEADING COACH: ONLY VERY LARGE MOVEMENTS -> MIXER MOTOR (engine)
//------------------------------------------------------------------------------------------
// Use case: recipes say "knead for 10 minutes", but what counts is the work you put in,
// not the clock. Put the phone in your apron pocket or strap it to your forearm and knead
// (or whisk). You become the stand mixer: a motor sound follows your pace, rising as you
// work harder. Small movements are ignored. When you have done enough work, the motor
// spins down and stops: the dough is ready.
//
// Gesture: only very large movements (kneading / whisking strokes).
// Mapping: movement intensity above a high threshold -> motor speed (maxSpeed) + motor on;
//          accumulated work -> progress; progress 100% -> motor switches off (done).
// Sound: engine.wasm (faust-dsp/Engine/engine.dsp).
//==========================================================================================
let dspNode = null;
let dspNodeParams = null;
let jsonParams = null;

const dspName = "engine";
const instance = new FaustWasm2ScriptProcessor(dspName);

// output to window or npm package module
if (typeof module === "undefined") {
    window[dspName] = instance;
} else {
    const exp = {};
    exp[dspName] = instance;
    module.exports = exp;
}

engine.createDSP(audioContext, 1024)
    .then(node => {
        dspNode = node;
        dspNode.connect(audioContext.destination);
        console.log('params: ', dspNode.getParams());
        const jsonString = dspNode.getJSON();
        jsonParams = JSON.parse(jsonString)["ui"][0]["items"];
        dspNodeParams = jsonParams;
        dspNode.setParamValue("/engine/gate", 0);        // motor off at start
        dspNode.setParamValue("/engine/runtime", 0.8);   // seconds to spin up / down (default 5 is too slow)
        getMinMaxParam("/engine/maxSpeed");   // 0..1
        getMinMaxParam("/engine/volume");     // 0..1
    });

//==========================================================================================
// TUNING — change these while testing
//==========================================================================================
const G = 9.81;
const LARGE = 4;              // m/s^2 away from gravity: below this a movement is "small" and ignored
const FULL = 14;              // movement that counts as maximum effort
const WORK_SECONDS = 8;       // seconds of full-effort kneading needed (demo; ~10 min in real use)
const VOLUME = 0.5;           // safety cap for headphones (DSP max is 1)

let effort = 0;               // smoothed 0..1
let progress = 0;             // 0..1
let done = false;

//==========================================================================================
// SENSOR: how large is the movement?
//==========================================================================================
let movement = 0;             // latest |acceleration - gravity| in m/s^2
window.addEventListener("devicemotion", (e) => {
    const g = e.accelerationIncludingGravity;
    if (!g || g.x === null) return;
    movement = Math.abs(Math.hypot(g.x, g.y, g.z) - G);
});

//==========================================================================================
// INTERACTIONS (called every frame by sketch.js)
//==========================================================================================

function accelerationChange(accx, accy, accz) {
    const dt = deltaTime / 1000;

    // Only very large movements count; smooth over ~0.4 s so the motor follows your rhythm
    const target = constrain((movement - LARGE) / (FULL - LARGE), 0, 1);
    effort += (target - effort) * (1 - Math.exp(-dt / 0.4));

    if (!done) {
        progress = Math.min(1, progress + effort * dt / WORK_SECONDS);
        if (progress >= 1) done = true;
    }

    if (dspNode && audioContext.state === 'running') {
        const motorOn = !done && effort > 0.05;
        dspNode.setParamValue("/engine/gate", motorOn ? 1 : 0);
        // Motor speed follows your effort; it also rises a bit as the dough develops
        dspNode.setParamValue("/engine/maxSpeed", 0.1 + 0.5 * effort + 0.2 * progress);
        dspNode.setParamValue("/engine/volume", VOLUME);
    }
    updateReadout();
}

function rotationChange(rotx, roty, rotz) {
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

function playAudio() {
}

function updateReadout() {
    // Display inside the description box of sound4.html (<p id="kneadDisplay">)
    const display = document.getElementById("kneadDisplay");
    if (!display) return;
    const state = done ? "dough ready!" : effort > 0.05 ? "kneading" : "knead harder";
    display.textContent = `${Math.round(progress * 100)}%  ${state}`;
}

//==========================================================================================
// END
//==========================================================================================
