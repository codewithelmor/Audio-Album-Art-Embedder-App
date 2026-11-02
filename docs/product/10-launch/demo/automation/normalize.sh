#!/bin/sh
# Second (linear) loudnorm pass on the assembled MP4: target -16 LUFS, true peak -1.5 dB. Run from the demo folder.
N=exports/audio-album-art-embedder-demo-v1.0.0
J=$(ffmpeg -hide_banner -i $N.mp4 -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
ffmpeg -y -v error -i $N.mp4 -map 0:v -map 0:a -map_chapters 0 -c:v copy \
 -af "loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true" \
 -c:a aac -b:a 160k -ar 48000 -movflags +faststart exports/tmp/ln.mp4 && mv exports/tmp/ln.mp4 $N.mp4
