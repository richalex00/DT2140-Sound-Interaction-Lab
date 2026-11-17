declare name "recipeBook";
declare description "Recipe book: paper rustle + page-turn swoosh (wind-like filtered noise) + marimba note (course marimba model).";
import("stdfaust.lib");

// --- Marimba (same model as faust-dsp/Musical-Instruments/marimbaMIDI.dsp) ---
marimba = pm.marimba_ui_MIDI;

// --- Paper ---
bend   = hslider("paper/bend", 0, 0, 1, 0.01) : si.smoo;   // how far the page is lifted (tilt)
flip   = button("paper/flip");                               // the page turns over
pan    = hslider("paper/pan", 0.5, 0, 1, 0.01);              // 0 = towards left, 1 = towards right
paperVol = hslider("paper/volume", 0.5, 0, 1, 0.01);

// Rustle: sparse crackles of the sheet bending (rain-like grains), more when lifted further
grains(d) = _ <: @(1), (abs < d) : *;
rustle = no.noise : grains(bend * bend * 0.03) : fi.resonbp(3200, 1.5, 1) : *(3 * bend);

// Swoosh: a burst of air (wind-like noise) whose band sweeps up while the page falls over
env    = en.ar(0.03, 0.35, flip);
swoosh = no.noise : fi.resonbp(500 + 4000 * env, 2, 1) : *(env * 0.8);

paper = (rustle + swoosh) * paperVol;

process = marimba, paper : (_ <: _, _), (_ <: *(1 - pan), *(pan)) :> ma.tanh, ma.tanh;
