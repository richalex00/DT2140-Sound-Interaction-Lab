//==========================================================================================
// INTERACTION 2 — HOURGLASS (egg / tea timer): STAND THE PHONE UP -> SAND (rain model)
//------------------------------------------------------------------------------------------
// Use case: a quick timer for boiled eggs or tea, with nothing to set. Stand the phone
// upright like an hourglass and you hear the sand running. It thins out at the end and
// stops when the time is over. Like a real hourglass:
//   - lay it down        -> the sand stops (pause)
//   - turn it upside down -> the sand runs back (the time already passed comes back)
//
// Gesture: point straight up (phone standing upright, top up or top down).
// Mapping: phone upright + sand left on top -> sand stream (flow), last grains fade out.
// Sound: hourglass.wasm (faust-dsp/Kitchen/hourglass.dsp), built on the rain model.
//==========================================================================================
let dspNode = null;
let dspNodeParams = null;
let jsonParams = null;

const dspName = "hourglass";
const instance = new FaustWasm2ScriptProcessor(dspName);

// output to window or npm package module
if (typeof module === "undefined") {
    window[dspName] = instance;
} else {
    const exp = {};
    exp[dspName] = instance;
    module.exports = exp;
}

hourglass.createDSP(audioContext, 1024)
    .then(node => {
        dspNode = node;
        dspNode.connect(audioContext.destination);
        console.log('params: ', dspNode.getParams());
        const jsonString = dspNode.getJSON();
        jsonParams = JSON.parse(jsonString)["ui"][0]["items"];
        dspNodeParams = jsonParams;
        dspNode.setParamValue("/hourglass/flow", 0);   // continuous sound: silent at start
        getMinMaxParam("/hourglass/flow");     // 0..1
        getMinMaxParam("/hourglass/volume");   // 0..1
    });

//==========================================================================================
// TUNING — change these while testing
//==========================================================================================
const DURATION = 15;          // seconds for all the sand to run (demo; 180 = 3 min for eggs)
const UPRIGHT_G = 8;          // m/s^2 of gravity along the long axis = phone standing up
const FADE = 0.06;            // the last 6% of sand falls as thinning grains
const VOLUME = 0.35;          // safety cap for headphones (DSP max is 1)

let sandA = 1;                // fraction of sand in half A (the top half when the phone is upright)
let pose = "flat";            // "up", "down" or "flat"

//==========================================================================================
// SENSOR: which way is the phone standing?
//==========================================================================================
window.addEventListener("devicemotion", (e) => {
    const g = e.accelerationIncludingGravity;
    if (!g || g.y === null) return;
    pose = g.y > UPRIGHT_G ? "up" : g.y < -UPRIGHT_G ? "down" : "flat";
});

//==========================================================================================
// INTERACTIONS (called every frame by sketch.js)
//==========================================================================================

function accelerationChange(accx, accy, accz) {
    const dt = deltaTime / 1000;

    // Sand moves from the top half to the bottom half; nothing moves when lying down
    let top = 0;
    if (pose === "up") {
        sandA = Math.max(0, sandA - dt / DURATION);
        top = sandA;
    } else if (pose === "down") {
        sandA = Math.min(1, sandA + dt / DURATION);
        top = 1 - sandA;
    }

    // Full stream while there is sand on top, thinning grains at the very end
    const flow = top > 0 ? Math.min(1, 0.25 + 0.75 * top / FADE) : 0;
    if (dspNode && audioContext.state === 'running') {
        dspNode.setParamValue("/hourglass/flow", flow);
        dspNode.setParamValue("/hourglass/volume", VOLUME);
    }
    updateReadout(top);
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

function updateReadout(top) {
    // Display inside the description box of sound2.html (<p id="hourglassDisplay">)
    const display = document.getElementById("hourglassDisplay");
    if (!display) return;
    const left = Math.round((pose === "flat" ? sandA : top) * DURATION);   // paused: sand left if stood up
    const state = pose === "flat" ? "paused (stand it up)" : top > 0 ? "sand running" : "time's up!";
    display.textContent = `${left} s  ${state}`;
}

//==========================================================================================
// END
//==========================================================================================
