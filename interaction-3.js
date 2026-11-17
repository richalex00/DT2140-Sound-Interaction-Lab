//==========================================================================================
// INTERACTION 3 — RECIPE READER: TILT THE PHONE SIDE TO SIDE -> PAGE TURN + MARIMBA NOTE
//------------------------------------------------------------------------------------------
// Use case: your hands are covered in flour and you need the next step of the recipe.
// Hold the phone flat (or lift it with your wrist) and tilt it to the right to go to the
// next step, to the left to go back, like turning the page of a cookbook:
//   - while you tilt, you hear the paper rustle, more and more as the page lifts
//   - past the threshold the page turns over with a swoosh (left or right in stereo)
//   - then a marimba note confirms the step: the note goes up as you advance, so its
//     pitch tells you how far you are in the recipe. The last step plays an arpeggio.
//
// Gesture: phone flat in hand, tilted side to side.
// Mapping: tilt angle -> paper rustle (bend); tilt > TILT_DEG -> page swoosh + next/previous
//          step; step number -> note pitch (pentatonic scale, low = start, high = end).
// Sound: recipeBook.wasm (faust-dsp/Kitchen/recipeBook.dsp): paper + course marimba model.
//==========================================================================================
let dspNode = null;
let dspNodeParams = null;
let jsonParams = null;

const dspName = "recipeBook";
const instance = new FaustWasm2ScriptProcessor(dspName);

// output to window or npm package module
if (typeof module === "undefined") {
    window[dspName] = instance;
} else {
    const exp = {};
    exp[dspName] = instance;
    module.exports = exp;
}

recipeBook.createDSP(audioContext, 1024)
    .then(node => {
        dspNode = node;
        dspNode.connect(audioContext.destination);
        console.log('params: ', dspNode.getParams());
        const jsonString = dspNode.getJSON();
        jsonParams = JSON.parse(jsonString)["ui"][0]["items"];
        dspNodeParams = jsonParams;
        dspNode.setParamValue("/recipeBook/marimba/otherParams/outGain", 0.6);
        dspNode.setParamValue("/recipeBook/paper_volume", 0.5);
        getMinMaxParam("/recipeBook/marimba/midi/freq");             // 50..1000
        getMinMaxParam("/recipeBook/marimba/otherParams/outGain");   // 0..1
        getMinMaxParam("/recipeBook/paper_bend");                    // 0..1
    });

//==========================================================================================
// RECIPE (demo content)
//==========================================================================================
const RECIPE = [
    "Pasta carbonara — tilt right to start",
    "1. Boil salted water",
    "2. Fry the guanciale until crispy",
    "3. Beat 3 egg yolks with pecorino and pepper",
    "4. Cook the pasta al dente",
    "5. Mix pasta and guanciale off the heat",
    "6. Add the egg mix and a little pasta water, stir",
    "Done! Buon appetito",
];
// One note per step, C major pentatonic going up (Hz)
const NOTES = [262, 294, 330, 392, 440, 523, 587, 659];

//==========================================================================================
// TUNING — change these while testing
//==========================================================================================
const TILT_DEG = 25;          // tilt needed to turn the page
const REARM_DEG = 10;         // go back near level before the next page turn
const GAIN = 0.8;             // marimba strike strength (outGain is capped at 0.6)

let step = 0;
let armed = true;
let roll = 0;                 // side-to-side tilt in degrees (+ = right side down)

//==========================================================================================
// SENSOR: side-to-side tilt from gravity
//==========================================================================================
window.addEventListener("devicemotion", (e) => {
    const g = e.accelerationIncludingGravity;
    if (!g || g.x === null) return;
    if (g.z < 3) return;                       // only while the phone is roughly flat, face up
    roll = Math.atan2(-g.x, g.z) * 180 / Math.PI;

    if (armed && roll > TILT_DEG) { armed = false; turnPage(+1); }
    if (armed && roll < -TILT_DEG) { armed = false; turnPage(-1); }
    if (Math.abs(roll) < REARM_DEG) armed = true;

    // Paper rustle: the page lifts as you tilt towards the threshold (silent after it turned)
    const bend = armed ? constrain((Math.abs(roll) - REARM_DEG) / (TILT_DEG - REARM_DEG), 0, 1) : 0;
    if (dspNode && audioContext.state === 'running') {
        dspNode.setParamValue("/recipeBook/paper_bend", bend);
    }
});

function turnPage(direction) {
    const next = constrain(step + direction, 0, RECIPE.length - 1);
    if (next === step) {
        note(NOTES[step], 0.3);                // already at the start/end: soft repeat
        return;
    }
    step = next;
    pageSwoosh(direction);
    // The note comes when the page has landed
    setTimeout(() => note(NOTES[step], GAIN), 250);
    if (step === RECIPE.length - 1) {          // finished: short arpeggio
        setTimeout(() => note(NOTES[step] * 1.25, GAIN), 430);
        setTimeout(() => note(NOTES[step] * 1.5, GAIN), 610);
    }
}

//==========================================================================================
// INTERACTIONS (called every frame by sketch.js)
//==========================================================================================

function accelerationChange(accx, accy, accz) {
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

function note(freq, gain) {
    // The gate must stay at 1 for longer than one audio buffer (1024 samples ≈ 21 ms)
    if (!dspNode || audioContext.state !== 'running') return;
    dspNode.setParamValue("/recipeBook/marimba/midi/freq", freq);
    dspNode.setParamValue("/recipeBook/marimba/midi/gain", gain);
    dspNode.setParamValue("/recipeBook/marimba/gate", 1);
    setTimeout(() => { dspNode.setParamValue("/recipeBook/marimba/gate", 0) }, 40);
}

function pageSwoosh(direction) {
    // The page falls towards the side you tilted: right = next, left = back
    if (!dspNode || audioContext.state !== 'running') return;
    dspNode.setParamValue("/recipeBook/paper_pan", direction > 0 ? 0.8 : 0.2);
    dspNode.setParamValue("/recipeBook/paper_flip", 1);
    setTimeout(() => { dspNode.setParamValue("/recipeBook/paper_flip", 0) }, 60);
}

function playAudio() {
    note(NOTES[step], GAIN);
}

function updateReadout() {
    // Display inside the description box of sound3.html (<p id="recipeDisplay">)
    const display = document.getElementById("recipeDisplay");
    if (!display) return;
    display.textContent = RECIPE[step];
}

//==========================================================================================
// END
//==========================================================================================
