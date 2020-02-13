var Module = {
  onRuntimeInitialized: () => init(Module)
};


function init(module) {
	let video = document.getElementById('video');

	const constraints = {
	    audio: false,
	    video: { width: 640, height: 480 }
	};

	navigator.mediaDevices.getUserMedia(constraints)
	    .then(success)
	    .catch(error);

	function success(stream) {
		const video = document.getElementById('video');
		video.srcObject = stream;
		video.onloadedmetadata = e => video.play();

		// It's used to capture frame and invisible  
		const canvasVideo = document.getElementById('canvasVideo');
		const canvasContext = canvasVideo.getContext('2d');

		// Prepare Emscrypten functions
        const onInit = module.cwrap('onInit', null, ['number', 'number', 'number']);
        const addMarker = module.cwrap('addMarker', null, ['number', 'number', 'number']);
        const onProcess = module.cwrap('onProcess', 'number', ['number', 'number', 'number']);
		const finalizeMarkers = module.cwrap('finalizeMarkers', null);
	    //void addMarker(void *marker, int width, int height);
	    //void onProcess(void const *source, void *result, int width, int height);


        // Prepare space for initial frame and result image{cv}
        // It will be rewritten everytime - you do not need to free memory in the loop
 		const imageWidth = canvasVideo.width;
 		const imageHeight = canvasVideo.height;

		//const { data, width, height } = getImageData()
		canvasContext.drawImage(video, 0, 0, canvasVideo.width, canvasVideo.height);
		let imageData = canvasContext.getImageData(0, 0, canvasVideo.width, canvasVideo.height);
		console.log(ImageData)

       	const bufferSize = imageWidth * imageHeight * 4;
        let inputBuf = module._malloc(bufferSize);
   		let temp1 = new Uint8ClampedArray(module.HEAPU8.buffer, inputBuf, bufferSize);
		temp1.set(imageData.data, 0);

		onInit(inputBuf, imageWidth, imageHeight);
		addMarkers(module, addMarker, finalizeMarkers);
		//addMarkerFromImg(module, addMarker);
		module._free(inputBuf);	
		module._free(temp1);	
		module._free(imageData);	

		let canvasOutput = document.getElementById('canvasOutput');
		const aspectRatio = canvasOutput.width / canvasOutput.height;
		let camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 100);

		let scene = new THREE.Scene();
		initScene3JS(scene);
		let scene_model = new THREE.Scene();
		init3Dmodel(scene_model);

		let renderer = new THREE.WebGLRenderer({canvas: canvasOutput,
												antilias: false,
											    alpha: true
											  });

		const cam_par = [];
		const capture = function () {
			var t0 = Date.now();

			canvasContext.drawImage(video, 0, 0, imageWidth, imageHeight);

			imageData = canvasContext.getImageData(0, 0, imageWidth, imageHeight).data;
			const inputBuf2 = module._malloc(bufferSize);
			module.HEAPU8.set(imageData, inputBuf2)

			var t1 = Date.now();

			let result = onProcess(inputBuf2, imageWidth, imageHeight);

			var t2 = Date.now();
			console.log("onProcess time is:");
			console.log(t2 - t1);

			for (let v=0; v<10;v++){
				cam_par.push(Module.HEAPF32[result/Float32Array.BYTES_PER_ELEMENT+v]);
			}
			console.log(cam_par);

			// Rendering depends on marker id. If no marker in scene, it clear all.
			// There was a problem: if zIndex = 10 from the first frame, the video is not visible
			if (cam_par[0] == 0) {
				camera = set_camera(camera, cam_par);
				renderer.render(scene, camera);
				canvasOutput.style.zIndex = "10";
			} else if (cam_par[0] == 1){
				camera = set_camera(camera, cam_par);
				renderer.render(scene_model, camera)
				canvasOutput.style.zIndex = "10";
			} else {
				renderer.clear();
			}

			for (let v=0; v<10;v++){
				cam_par.pop();
			} 
			module._free(inputBuf2);
			module._free(result);	

			var t4 = Date.now();
			console.log("Total time is:");
			console.log(t4-t0);

        	requestAnimationFrame(capture);
		};

		capture();
	};
};


function find_camera_parameters(onProcess, canvasContext, bufferSize, imageWidth, imageHeight){
	var t0 = Date.now();

	let imageData = canvasContext.getImageData(0, 0, imageWidth, imageHeight);

	let inputBuf2 = Module._malloc(bufferSize);
	let temp2 = new Uint8ClampedArray(Module.HEAPU8.buffer, inputBuf2, bufferSize);
	temp2.set(imageData.data, 0);

	var t1 = Date.now();
	console.log("Buffer time is:");
	console.log(t1 - t0);

	result = onProcess(inputBuf2, imageWidth, imageHeight);

	var t2 = Date.now();
	console.log("onProcess time is:");
	console.log(t2 - t1);

	const cam_par = [];
	for (let v=0; v<10;v++){
		cam_par.push(Module.HEAPF32[result/Float32Array.BYTES_PER_ELEMENT+v]);
	}


	var t3 = Date.now();
	console.log("ReBuffer time is:");
	console.log(t3 - t2);

	Module._free(imageData);
	Module._free(inputBuf2);
	Module._free(temp2);
	Module._free(result);	

	var t4 = Date.now();
	console.log("Free time is:");
	console.log(t4 - t3);

	return cam_par;
};


function set_camera(camera, par){
    camera.position.set(par[1], par[2], par[3]);
    camera.lookAt(par[4], par[5], par[6]);
    camera.up.set(par[7], par[8], par[9]);

    return camera;
};



function initScene3JS(scene){
	//renderer.setClearColor(0x00000);
	// Light
	const color = 0xffffff;
	const intens = 1;
	const light = new THREE.DirectionalLight(color, intens);
	light.position.set(-1, 2, 4);
	scene.add(light);

	// Meshes
    const geometry = new THREE.CylinderGeometry(0.03, 0.03, 1.02, 32);

    function makeInstance(geometry, color) {
	    const material = new THREE.MeshPhongMaterial({color});
	    const cube = new THREE.Mesh(geometry, material);
	    scene.add(cube);
	    return cube;
	}
    // 4 cylinders
    const c1 = makeInstance(geometry, 0x2194ce);
    c1.position.set(-0.5,0,0);
    
    const c2 = makeInstance(geometry, 0x2194ce);
    c2.position.set(0.5,0,0);
    
    const c3 = makeInstance(geometry, 0x2194ce);
    c3.rotation.z = Math.PI / 2;
    c3.position.set(0,0.5,0);
            
    const c4 = makeInstance(geometry, 0x2194ce);
    c4.rotation.z = Math.PI / 2;
    c4.position.set(0,-0.5,0);
};


function init3Dmodel(scene_model){
		const configJSON = `{
        "models": [
            {"id": 0, "path" : "models/dancing/scene.gltf", "position" : [0.0, 0.0, 0.0], "rotation" : [1, -1.0, 0.0], "scale" : 0.4}]
        }`;
           //{"id": 1, "path" : "models/diorama_low.glb", "position" : [0.1, 0.1, -1.0], "rotation" : [1.57079, 0.0, 0.0], "scale" : 0.15}
        

        var objLoader = new THREE.GLTFLoader();
        const config= JSON.parse(configJSON);
        let models = new Map();

        for (let m of config.models) {
            objLoader.load(m.path, (g) => {
                const model = g.scene;
                model.scale.set(m.scale, m.scale, m.scale);
                model.rotation.set(m.rotation[0], m.rotation[1], m.rotation[2]);
                model.position.set(m.position[0], m.position[1], m.position[2]);
    			scene_model.add(model);
                models.set(m.id, model);
            }, (e) => {
                console.error('MODEL ERROR e=', e);
            });
        }

   // const model = models.get(0);
    //scene_model.add(model);
};



const getImageData = () => {
  console.log('[getImageData]');
  const canvas = document.getElementById('canvasVideo');
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  console.log(ImageData)
  return imageData;
};

const drawOutputImage = (imageData, canvasId) => {
  console.log('[drawOutputImage]');
  const canvas = document.getElementById(canvasId);
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  console.log(ImageData);
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
};


const addMarkerFromImg = (module, addMarker, markerData, width, height) => {
	console.log("Load Marker");
	bufferSizeMarker = width* height* 4;

	markerBuf = module._malloc(bufferSizeMarker);
	module.HEAPU8.set(markerData.data, markerBuf);

	addMarker(markerBuf, width, height);
	module._free(markerBuf);
	module._free(markerData);
};


const addMarkers = (module, addMarker, finalizeMarkers) => {
	const canvasImg = document.getElementById('canvasImg');
	const contextImg = canvasImg.getContext('2d');
	let img = document.getElementById('img');

	for(let i=1; i <= 2; i++) {
		//const img = document.createElement('image');
		imgName = ['img',i].join('');
		img = document.getElementById(imgName);
		console.log(imgName);

		//img.src = markerName;
		//img.src = 'images/M2.png';
		console.log(img.height);
		canvasImg.width = img.width;
		canvasImg.height = img.height;
		contextImg.drawImage(img, 0, 0);
		const markerData = contextImg.getImageData(0,0, img.width, img.height);

		addMarkerFromImg(module, addMarker, markerData,  img.width, img.height);
	}

	finalizeMarkers();
};