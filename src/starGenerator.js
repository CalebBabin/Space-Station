import * as THREE from 'three';

module.exports = (config = {}) => {
	config = Object.assign({ density: 2, opacity: 1, mapSize: 4096, starSize: 2 }, config);

	const canvas = document.createElement('canvas');
	canvas.width = config.mapSize;
	canvas.height = config.mapSize;
	const ctx = canvas.getContext('2d');

	const starCanvas = document.createElement('canvas');
	starCanvas.width = config.starSize*2;
	starCanvas.height = config.starSize*2;
	const starCtx = starCanvas.getContext('2d');
	starCtx.fillStyle = `rgba(255,255,255,${config.opacity})`;
	starCtx.beginPath();
	starCtx.arc(config.starSize, config.starSize, config.starSize, 0, 2 * Math.PI);
	starCtx.fill();

	for (let index = 0; index < (config.mapSize/2)*config.density; index++) {
		const x = Math.random(), y = Math.random();
		ctx.drawImage(starCanvas, x*config.mapSize - (config.starSize/2), y*config.mapSize - (config.starSize/2))
	}

	const plane = new THREE.Mesh(
		new THREE.PlaneBufferGeometry(1, 1, 1, 1),
		new THREE.MeshBasicMaterial({
			map: new THREE.CanvasTexture(canvas),
		})
	)

	return plane;
}