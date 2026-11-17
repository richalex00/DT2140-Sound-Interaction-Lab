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
// ✅ CHANGED 1 (Interaction 2) — the sound for this page is now "marimbaMIDI" (marimba). It was "bells".
const dspName = "marimbaMIDI";
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
// ✅ CHANGED 2 (Interaction 2) — same name again here: marimbaMIDI.createDSP (it must match CHANGED 1 or nothing loads).
marimbaMIDI.createDSP(audioContext, 1024)
    .then(node => {
        dspNode = node;
        dspNode.connect(audioContext.destination);
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

function accelerationChange(accx, accy, accz) {
    // playAudio()
}

// ✅✅✅ CHANGED 3 (Interaction 2) — THE CORE OF MAPPING 2 ✅✅✅ ------------------------------
// rotationChange() is called by p5 EVERY FRAME (~60 times a second) with the phone's tilt.
// roty = left/right tilt in radians: 0 when flat, about -0.8 tilted left, +0.8 tilted right.
// MAPPING 2 — SWEEPING ACROSS THE ORCHESTRA
// Action: the phone is placed flat in the hand and tilted from side to side.
// Sound:  marimba notes. Tilted left = low notes, tilted right = high notes,
//         like a conductor turning from the low instruments to the high ones.
const NOTES = [523, 587, 659, 784, 880];   // C D E G A (a pentatonic scale: any order sounds musical)
let lastNote = -1;                          // the note zone we were in last frame

function rotationChange(rotx, roty, rotz) {
    // turn the tilt into a number from 0 (fully left) to 1 (fully right)
    let position = (roty + 0.8) / 1.6;
    position = Math.min(Math.max(position, 0), 0.999);   // keep it inside 0..1

    // split the tilt range into 5 zones, one per note
    const note = Math.floor(position * NOTES.length);    // 0, 1, 2, 3 or 4

    // play a note only when the tilt moves into a NEW zone
    if (note !== lastNote) {
        lastNote = note;
        playAudio(NOTES[note]);
    }
}
// ✅✅✅ END OF CHANGED 3 (Interaction 2) ----------------------------------------------------

// ✅ CHANGED 4 (Interaction 2) — clicking/tapping the page plays a middle note, to test the sound without tilting.
function mousePressed() {
    playAudio(659)
    // Use this for debugging from the desktop!
}

function deviceMoved() {
    movetimer = millis();
    statusLabels[2].style("color", "pink");
}

function deviceTurned() {
    threshVals[1] = turnAxis;
}
// ✅ CHANGED 5 (Interaction 2) — removed playAudio() from deviceShaken(), so shaking doesn't play extra notes.
//    Only the tilt (CHANGED 3) plays the marimba.
function deviceShaken() {
    shaketimer = millis();
    statusLabels[0].style("color", "pink");
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

// ✅ CHANGED 6 (Interaction 2) — playAudio(frequency) now strikes the MARIMBA (it was a bell) at the given note.
function playAudio(frequency) {
    if (!dspNode) {
        return;
    }
    if (audioContext.state === 'suspended') {
        return;
    }
    // dspNode.setParamValue(address, value) is how we control the sound (addresses listed in the browser console)
    dspNode.setParamValue("/marimba/midi/freq", frequency);   // which note (Hz)
    dspNode.setParamValue("/marimba/midi/gain", 1);           // full loudness
    dspNode.setParamValue("/marimba/gate", 1);                // strike the bar...
    setTimeout(() => { dspNode.setParamValue("/marimba/gate", 0) }, 100);   // ...and release
}

//==========================================================================================
// END
//==========================================================================================