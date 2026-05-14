@REM ffmpeg -i demo.mkv -vf "fps=15,palettegen" palette.png
@REM ffmpeg -i demo.mkv -i palette.png -lavfi "fps=15[x];[x][1:v]paletteuse=dither=sierra2_4a" demo.gif

ffmpeg -i demo.mkv -vf "fps=20,palettegen" palette.png
ffmpeg -i demo.mkv -i palette.png -lavfi "fps=20[x];[x][1:v]paletteuse=dither=sierra2_4a" demo.gif
