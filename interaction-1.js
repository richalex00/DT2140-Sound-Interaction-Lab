//==========================================================================================
// AUDIO SETUP
//------------------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------------------
// Edit just where you're asked to!
//------------------------------------------------------------------------------------------
//
//==========================================================================================
let dspNode = null;
let dspNodeParams = null;
let jsonParams = null;

// Change here to ("tuono") depending on your wasm file name
// ★ EDIT 1 — which sound this page uses. Set to the .wasm file name without ".wasm" (e.g. "rain").
const dspName = "djembeMIDI";
const instance = new FaustWasm2ScriptProcessor(dspName);

// output to window or npm package module
if (typeof module === "undefined") {
    window[dspName] = instance;
} else {
    const exp = {};
    exp[dspName] = instance;
    module.exports = exp;
}

// The name should be the same as the WASM file, so change tuono with brass if you use brass.wasm
// ★ EDIT 2 — same name again here (e.g. rain.createDSP). If 1 and 2 don't match, nothing loads.
djembeMIDI.createDSP(audioContext, 1024)
    .then(node => {
        dspNode = node;
        dspNode.connect(audioContext.destination);
        // ★ READ — this prints the sound's parameter addresses in the browser console. The addresses you can set are listed there.
        console.log('params: ', dspNode.getParams());
        const jsonString = dspNode.getJSON();
        jsonParams = JSON.parse(jsonString)["ui"][0]["items"];
        dspNodeParams = jsonParams
        // const exampleMinMaxParam = findByAddress(dspNodeParams, "/thunder/rumble");
        // // ALWAYS PAY ATTENTION TO MIN AND MAX, ELSE YOU MAY GET REALLY HIGH VOLUMES FROM YOUR SPEAKERS
        // const [exampleMinValue, exampleMaxValue] = getParamMinMax(exampleMinMaxParam);
        // console.log('Min value:', exampleMinValue, 'Max value:', exampleMaxValue);
    });


//==========================================================================================
// INTERACTIONS
//------------------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------------------
// Edit the next functions to create interactions
// Decide which parameters you're using and then use playAudio to play the Audio
//------------------------------------------------------------------------------------------
//
//==========================================================================================

// ★ EDIT 3 — called EVERY FRAME (~60x/s) with linear acceleration (gravity removed, ×2). At rest ≈ 0. Use for shake/movement energy.
// MAPPING 1 — THE DOWNBEAT
// Action: the phone detects very large movements, but not small ones.
// Sound:  a drum (djembe) beat. A harder swing gives a louder beat.
const BIG_MOVE = 30;   // how strong a movement must be to count as a beat (tune on the phone)
const WAIT_MS = 300;   // short pause after a beat, so one swing = one beat
let lastBeat = 0;

function accelerationChange(accx, accy, accz) {
    // how strong the movement is right now (≈ 0 when the phone is still)
    const strength = Math.abs(accx) + Math.abs(accy) + Math.abs(accz);

    // small movements are below BIG_MOVE, so they are ignored
    if (strength > BIG_MOVE && millis() - lastBeat > WAIT_MS) {
        lastBeat = millis();
        const volume = Math.min(strength / 80, 1);   // harder swing = louder, max 1
        playAudio(volume);
    }
}

// ★ EDIT 3 — called EVERY FRAME with orientation in RADIANS: rotx = front/back tilt (±π), roty = left/right tilt (±π/2), rotz = heading (0..2π, jumps at 0/2π). Use for tilt/level/pointing/spin.
function rotationChange(rotx, roty, rotz) {
}

// ★ READ — desktop testing: clicking the page plays the sound, so you can test without a phone.
function mousePressed() {
    playAudio(1)
    // Use this for debugging from the desktop!
}

function deviceMoved() {
    movetimer = millis();
    statusLabels[2].style("color", "pink");
}

function deviceTurned() {
    threshVals[1] = turnAxis;
}
// ★ EDIT 3 (alt) — p5 event fired when a shake passes the "shake threshold" slider. Currently plays the sound on every shake. Remove playAudio() here if you use a continuous mapping.
function deviceShaken() {
    shaketimer = millis();
    statusLabels[0].style("color", "pink");
    // no playAudio() here: beats come from accelerationChange above
}

function getMinMaxParam(address) {
    const exampleMinMaxParam = findByAddress(dspNodeParams, address);
    // ALWAYS PAY ATTENTION TO MIN AND MAX, ELSE YOU MAY GET REALLY HIGH VOLUMES FROM YOUR SPEAKERS
    const [exampleMinValue, exampleMaxValue] = getParamMinMax(exampleMinMaxParam);
    console.log('Min value:', exampleMinValue, 'Max value:', exampleMaxValue);
    return [exampleMinValue, exampleMaxValue]
}

//==========================================================================================
// AUDIO INTERACTION
//------------------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------------------
// Edit here to define your audio controls 
//------------------------------------------------------------------------------------------
//
//==========================================================================================

// ★ EDIT 4 — the "trigger" function. Change the address below to your sound's (e.g. "/thunder/rumble" → "/bubble/drop"). Forget this and the page is SILENT with no error.
function playAudio(volume) {
    if (!dspNode) {
        return;
    }
    if (audioContext.state === 'suspended') {
        return;
    }
    // Edit here the addresses ("/thunder/rumble") depending on your WASM controls (you can see 
    // them printed on the console of your browser when you load the page)
    // For example if you change to a bell sound, here you could use "/churchBell/gate" instead of
    // "/thunder/rumble".
    // ★ KEY CALL — dspNode.setParamValue(address, value) is how ALL sound control happens. Keep values inside the min..max (see getMinMaxParam).
    dspNode.setParamValue("/djembe/midi/gain", volume);   // loudness 0..1
    dspNode.setParamValue("/djembe/gate", 1);             // hit the drum...
    setTimeout(() => { dspNode.setParamValue("/djembe/gate", 0) }, 100);   // ...and release
}

//==========================================================================================
// END
//==========================================================================================