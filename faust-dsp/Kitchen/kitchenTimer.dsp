declare name "kitchenTimer";
declare description "Mechanical kitchen timer: ratchet tick + small bell (modal synthesis). Category: bells.";
import("stdfaust.lib");

// Controls (JS sends a short 1 -> 0 pulse on the buttons)
tickTrig = button("tick") : ba.impulsify;
ringTrig = button("ring") : ba.impulsify;
pitch    = hslider("pitch", 2300, 1000, 4000, 1);   // fundamental of the small bell (Hz)
tickVol  = hslider("tickVolume", 0.5, 0, 1, 0.01);
volume   = hslider("volume", 0.5, 0, 1, 0.01);

// Ratchet tick: very short noise burst through two resonances (plastic case + metal spring)
tick = no.noise * en.ar(0, 0.012, tickTrig)
     <: fi.resonbp(3800, 4, 1), fi.resonbp(1300, 6, 0.6) :> *(tickVol * 0.5);

// Small bell: impulse excites 5 inharmonic modes (ratios of a small hand bell), higher modes decay faster
ratios = (1, 2.76, 5.40, 8.93, 13.34);
t60s   = (1.6, 1.0, 0.6, 0.35, 0.2);
gains  = (1.0, 0.6, 0.4, 0.25, 0.15);
bell = ringTrig * 0.3 <: par(i, 5, pm.modeFilter(pitch * ba.take(i + 1, ratios), ba.take(i + 1, t60s), ba.take(i + 1, gains))) :> *(volume);

process = (tick + bell) : ma.tanh <: _, _;
