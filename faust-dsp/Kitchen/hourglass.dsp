declare name "hourglass";
declare description "Sand trickling in an hourglass, built on the rain model (sparse noise grains). Category: rain.";
import("stdfaust.lib");

flow   = hslider("flow", 0, 0, 1, 0.01) : si.smoo;      // 0 = no sand falling, 1 = full stream
volume = hslider("volume", 0.5, 0, 1, 0.01) : si.smoo;

// Same idea as rain.dsp: keep only the noise samples below a threshold -> random clicks ("grains")
grains(d) = _ <: @(1), (abs < d) : *;
// Sand is finer and softer than rain: many tiny grains, high-passed and slightly darkened
stream(n) = n : grains(flow * flow * 0.08) : fi.highpass(2, 1800) : fi.lowpass(2, 9000) : *(4);
// Continuous soft hiss of the stream underneath the grains
hiss(n) = n : fi.resonbp(4500, 1.2, 1) : *(flow * 0.06);

process = no.multinoise(2) : par(i, 2, (_ <: stream, hiss :> _) : *(volume) : ma.tanh);
