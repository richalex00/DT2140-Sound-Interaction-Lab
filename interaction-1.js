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
// ✅ CHANGED 1 (Interaction 1) — the sound for this page is now "djembeMIDI" (the drum). It was "tuono" (thunder).
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
// ✅ CHANGED 2 (Interaction 1) — same name again here: djembeMIDI.createDSP (it must match CHANGED 1 or nothing loads).
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

// ✅✅✅ CHANGED 3 (Interaction 1) — THE CORE OF MAPPING 1 ✅✅✅ ---------------------------------------------
// accelerationChange() is called by p5 EVERY FRAME (~60 times a second) with the phone's
// movement (acceleration without gravity, so it is ≈ 0 when the phone is still).
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
// ✅✅✅ END OF CHANGED 3 (Interaction 1) -------------------------------------------------------------------

// ★ EDIT 3 — called EVERY FRAME with orientation in RADIANS: rotx = front/back tilt (±π), roty = left/right tilt (±π/2), rotz = heading (0..2π, jumps at 0/2π). Use for tilt/level/pointing/spin.
function rotationChange(rotx, roty, rotz) {
}

// ✅ CHANGED 4 (Interaction 1) — clicking/tapping the page plays the drum at full volume, playAudio(1), to test the sound without swinging.
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
// ✅ CHANGED 5 (Interaction 1) — removed playAudio() from deviceShaken(), so shaking doesn't play extra beats.
//    Only our big-movement check (CHANGED 3) plays the drum.
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

// ✅ CHANGED 6 (Interaction 1) — playAudio(volume) now hits the DRUM (it was thunder), at the loudness it is given.
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
    // ✅ CHANGED 6 (Interaction 1, cont.) — dspNode.setParamValue(address, value) is how we control the sound.
    //    The addresses are the drum's controls (listed in the browser console).
    dspNode.setParamValue("/djembe/midi/freq", 100);      // highest drum pitch, so phone speakers can play it
    dspNode.setParamValue("/djembe/otherParams/strikeSharpness", 5);   // hard, sharp hit = loud and clear
    dspNode.setParamValue("/djembe/midi/gain", volume);   // loudness 0..1
    dspNode.setParamValue("/djembe/gate", 1);             // hit the drum...
    setTimeout(() => { dspNode.setParamValue("/djembe/gate", 0) }, 100);   // ...and release
}

//==========================================================================================
// END
//==========================================================================================