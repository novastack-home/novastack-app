let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000 );
let renderer = new THREE.WebGLRenderer();

function init(){
	let video = document.getElementById("video");
	const constraints = {
		audio: false,
	 	video: {weight: 640, height: 480}
	};

	navigator.mediaDevices.getUserMedia(constrains)
	.then(success);
	.catch(error);
}

function success(stream) {
	const video = document.getElementById('video');
	video.srcObject = stream;
	video.onloadedmetadata = e => video.play();

	const canvas = document.getElementById('canvasVideo');
	const canvasContext = canvasVideo.getContext('2d');

	const imageWidth = canvasVideo.width;
	const imageHeight = canvasVideo.height;

	

}

renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

let geometry = new THREE.BoxGeometry();
let material = new THREE.MeshBasicMaterial( { color: 0x00ff00});
let cube = new THREE.Mesh( geometry, material);
scene.add( cube );

camera.position.z = 50;
camera.position.x = 0;

function animate(){
	requestAnimationFrame( animate );
	cube.rotation.x += 0.0314;
	cube.rotation.y += 0.005;
	cube.position.z += 0.1;
	renderer.render( scene, camera );
}

animate();