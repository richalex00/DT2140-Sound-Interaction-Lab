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
// ✅ CHANGED 1 (Interaction 3) — kept "brass" as the sound for this page (the course already set it up).
const dspName = "brass";
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
brass.createDSP(audioContext, 1024)
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

// ✅✅✅ CHANGED 2 (Interaction 3) — THE CORE OF MAPPING 3 ✅✅✅ ------------------------------
// rotationChange() is called by p5 EVERY FRAME (~60 times a second) with the phone's tilt.
// rotx = front/back tilt in radians: 0 when the phone lies flat,
//        PI/2 (about 1.57) when it stands upright, pointing straight up.
// MAPPING 3 — RAISE THE BATON, THE BRASS SWELLS
// Action: the phone is used to point straight up.
// Sound:  brass. The higher you raise the phone, the harder the brass "blows" and the louder it plays.
//         Pointing straight up = full volume. Lying flat = silence.

function rotationChange(rotx, roty, rotz) {
    // how far the phone is raised: 0 = flat, 1 = pointing straight up
    let raised = rotx / (Math.PI / 2);
    raised = Math.min(Math.max(raised, 0), 1);   // keep it inside 0..1

    playAudio(raised);   // the raise sets the brass blowing pressure (continuous, every frame)
}
// ✅✅✅ END OF CHANGED 2 (Interaction 3) ----------------------------------------------------

// ✅ CHANGED 3 (Interaction 3) — note: on the laptop, clicking sets the pressure from where you click
//    (left = quiet, right = loud). We kept the course's test code as it is.
function mousePressed() {
    playAudio(mouseX/windowWidth)
    // Use this for debugging from the desktop!
}

function deviceMoved() {
    movetimer = millis();
    statusLabels[2].style("color", "pink");
}

function deviceTurned() {
    threshVals[1] = turnAxis;
}
// ✅ CHANGED 4 (Interaction 3) — removed playAudio() from deviceShaken(). It sent no pressure value,
//    which would break the brass. Only the raise (CHANGED 2) controls it.
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

function playAudio(pressure) {
    if (!dspNode) {
        return;
    }
    if (audioContext.state === 'suspended') {
        return;
    }
    // ✅ CHANGED 5 (Interaction 3) — removed console.log(pressure): it now runs every frame and would flood the console.
    // dspNode.setParamValue(address, value) is how we control the sound: pressure 0 = silent, 1 = loudest.
    dspNode.setParamValue("/brass/blower/pressure", pressure)
}

//==========================================================================================
// END
//==========================================================================================