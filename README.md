# dance

## Build

Install dependencies before building:

```sh
npm ci
```

The install step must run package lifecycle scripts. This applies the
`expo-video-audio-extractor` Android patch via `patch-package`; builds can fail
at `:expo-video-audio-extractor:compileReleaseKotlin` if install scripts are
skipped.

Build and install the Android release:

```sh
npm run build
```

For EAS builds, no extra command is needed as long as the build does not use
`npm ci --ignore-scripts` or `npm install --ignore-scripts`.

## Features

- Manage videos
	- Pick video from playlist
	- CRUD videos

- Video player
	- Basic functions: stop, play, press to fast forward forward and backwards
	- Video mirroring
	- Advanced controls
		- go forward and backward per count, per 8 count, per predefined section
		- bookmark sections to loop

## Future things
- AI analysis
	- Suggest points of improvement (drills, turns), youtube videos
	- Verbal tutorial or slowed down version of how to do the movement
- Piecing together videos from different angles
