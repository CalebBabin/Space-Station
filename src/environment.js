import * as THREE from 'three';

module.exports = (scene, globalConfig) => {
	scene.background = new THREE.Color(0x000000);

	const ambiLight = new THREE.AmbientLight(0x222222);
	scene.add(ambiLight);

	const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.5);
	scene.add(directionalLight);
}