# Webar Phase 3
This is complete WebAR Phase3 demo.
It is build on the next stack of technologies:
* Javascript
* ThreeJS for rendering 3D models
* Standard HTML5 protocols to access camera
* HTTPS + SSL certificates


## Versions switch

The current active version (commit 81b888d) shows 4 models on 6 markers. It is so called 'webar_phase2_lite'.
In order to switch to a full version with all 6 models on 6 markers one can simply checkout to the previous commit by
```
git checkout 6a0016d
```
or manually edit JS code as it is described below.


### Organisation of JS code
To speed up loading and parsing of JS code, it is better to use only a single file with all javascript. This file is `bundle.js`. To simplify editing of JS, we separated full code into parts: 

`src/components/AugmentedStream.js` contains main logic: gets video stream from devices, loads of markers, works with WASM functions to process frames and shows models over the frame.

`src/scenes` folder consists a few files to load or create ThreeJS scenes.


If you want to change something in code, you should edit any of these 3 files, we do not recommend to change `dist/index.js` directly. This file should be built by modules bundler using instructions below in the section `Save changes and build bundle`.


### Change models
You can change model by editing `src/models-config.js`:

the variable `modelsConfig` contains all models, which will be downloaded by user. Each model is placed in {} and has the following fields:
`id` - shows id of a corresponding marker. It will be visualized if this marker will be detected in the frame
`path` - path to the model location
`position` - initial position of model
`rotation` - initial rotation of model (in radians)
`scale` - original models can be too small or big, so you can regulate their size by scale factor

To change model you need to change `path`
To change corresponding marker image: you can change 'id'
To add/remove a new model you need to add/remove {} structure to `modelsConfig`

#### Model types

ThreeJS code in this repo can show only `glb` and `gltf` model types with a default model loader. It is highly recommend to convert models into `glb` or `gltf` instead of using an alternative loader for any other particular model format.


### Change marker
To change marker image you need to replace marker in the '/images/ar_markers' folder. They must be with name "M{id_number}" and with '.png' extension.

To add a new marker you need to modify `index.html` and `index.js` files:

1) Add  `<img id="img{id_number}" src="images/ar_markers/M{id_number}.png" hidden>` to `index.html`. In another way marker won't be downloaded by user. Increase id_number by 1.

2) Change the value of `nmarkers` variable in `addMarkers` function of `src/components/AugmentedStream.js`. This function add all markers with name `M{id_number}`, where id_number is from 1 to `nmarker`.


### Change environment texture
To change texture that will be used as environment map you need to modify `loadEnvironmentTexture` function at `src/components/AugmentedStream.js`.
Textures are stored in `textures/equirectangular` folder. Change first argument of `rgbeLoader.load` to load another texture.


### Save changes and build bundle
After all changes, you need to build with the whole code. For this purposes, we use Node.js.

#### Install dependencies
First, run in the terminal
```
npm i -g parcel-bundler
```

To run project locally you should also install server:
```
npm i -g http-server
```

#### Start npm
This command will start local server and watch changes in sources and rebuild bundle:
```
npm start
```

This command will only rebuild bundle:
```
npm run build
```
