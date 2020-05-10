import * as THREE from 'three';

import Chat from 'twitch-chat';
import starGenerator from './starGenerator';

const andromedaPNG = require('./andromeda.png');
const moonPNG = require('./moon.png');

let channels = ['moonmoon', 'antimattertape'];
const query_vars = {};
const query_parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
	query_vars[key] = value;
});
if (query_vars.channels) {
	channels = query_vars.channels.split(',');
}

const ChatInstance = new Chat({
	channels,
});

const easeInOutQuad = t => t<.5 ? 2*t*t : -1+(4-2*t)*t;

const emoteTextures = {};
const pendingEmoteArray = [];
ChatInstance.dispatch = (e)=>{
	const output = {emotes: []};
	for (let index = 0; index < e.emotes.length; index++) {
		const emote = e.emotes[index];
		if (!emoteTextures[emote.material.id]) {
			emoteTextures[emote.material.id] = new THREE.CanvasTexture(emote.material.canvas);
		}
		emote.texture = emoteTextures[emote.material.id];
		output.emotes.push(emote);
	}
	pendingEmoteArray.push(output);
}

const setupEnvironment = require('./environment.js');

const globalConfig = {
	speed: 0.002,
	emoteScale: 1,
	starPlanes: 4,
	cameraDistance: 25,
	cameraFar: 30,
}

const starPlanesArray = new Array(globalConfig.starPlanes);

const plane_geometry = new THREE.PlaneBufferGeometry(globalConfig.emoteScale, globalConfig.emoteScale);

const getSpawnPosition = () => {
	const side = 1;//Math.random() > 0.5 ? -1 : 1;
	const spawnHeightVariance = globalConfig.cameraDistance/1.5;
	return {
		x: (globalConfig.cameraDistance*1.25)*side,
		y: Math.random()*spawnHeightVariance-spawnHeightVariance/2,
		z: Math.random()*globalConfig.cameraDistance/1.5,
		vx: side*-1,
		vy: (Math.random()-0.5)/7,
		vz: (Math.random()-0.5)/2,
		side,
	}
}

window.addEventListener('DOMContentLoaded', () => {
	let camera, scene, renderer;

	const andromeda = new THREE.Mesh(
		plane_geometry,
		new THREE.MeshBasicMaterial({
			map: new THREE.TextureLoader().load(andromedaPNG),
		}),
	)
	andromeda.material.blending = THREE.AdditiveBlending;

	
	const moon = new THREE.Mesh(
		new THREE.CircleBufferGeometry(0.5, 64),
		new THREE.MeshBasicMaterial({
			map: new THREE.TextureLoader().load(moonPNG),
			transparent: false,
		}),
	)
	moon.material.blending = THREE.AdditiveBlending;


	init();
	draw();

	function init() {
		camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, globalConfig.cameraFar);
		camera.position.x = 0;
		camera.position.y = 0;
		camera.position.z = globalConfig.cameraDistance;
		camera.lookAt(0, 0, 0);

		scene = new THREE.Scene();
		setupEnvironment(scene, globalConfig);

		for (let index = 0; index < starPlanesArray.length; index++) {
			const variance = (starPlanesArray.length-index)/starPlanesArray.length;

			starPlanesArray[index] = starGenerator();
			starPlanesArray[index]._progress = variance;
			starPlanesArray[index].direction = 1;
			starPlanesArray[index].material.blending = THREE.AdditiveBlending;
			starPlanesArray[index].material.opacity = Math.sin(starPlanesArray[index]._progress);

			starPlanesArray[index].scale.x = globalConfig.cameraDistance*3;
			starPlanesArray[index].scale.y = globalConfig.cameraDistance*3;
			starPlanesArray[index].position.z = -variance + (-1);

			scene.add(starPlanesArray[index]);
		}

		scene.add(andromeda);
		andromeda.scale.x = 25;
		andromeda.scale.y = 25;
		andromeda.position.y = globalConfig.cameraDistance/1.35;
		andromeda.position.x = globalConfig.cameraDistance*1.2;
		andromeda.position.z = -5;

		scene.add(moon);
		moon.scale.x = 40;
		moon.scale.y = 40;
		moon.position.y = -globalConfig.cameraDistance;
		moon.position.x = -globalConfig.cameraDistance*1.4;
		moon.position.z = 0.001;

		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(window.innerWidth, window.innerHeight);
		window.addEventListener('resize', () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		})
		document.body.appendChild(renderer.domElement);
	}

	let lastFrame = Date.now();
	function draw() {
		requestAnimationFrame(draw);

		for (const key in emoteTextures) {
			if (emoteTextures.hasOwnProperty(key)) {
				const element = emoteTextures[key];
				element.needsUpdate = true;
			}
		}

		let speedTimeRatio = (Date.now() - lastFrame) / 16;
		if (speedTimeRatio === NaN) speedTimeRatio = 1;
		lastFrame = Date.now();

		andromeda.rotation.z += 0.0003;
		moon.rotation.z += 0.0001;

		for (let index = 1; index < starPlanesArray.length; index++) {
			const element = starPlanesArray[index];
			const ratio = 0.0001*speedTimeRatio*starPlanesArray[index].direction;
			starPlanesArray[index]._progress += (ratio || 0.01);
			if (starPlanesArray[index]._progress >= 1) starPlanesArray[index].direction =-1;
			if (starPlanesArray[index]._progress <= 0) starPlanesArray[index].direction =1;

			starPlanesArray[index].material.opacity = easeInOutQuad(starPlanesArray[index]._progress);
		}

		for (let index = 0; index < pendingEmoteArray.length; index++) {
			const emotes = pendingEmoteArray[index];

			if (!emotes.group) {
				emotes.group = new THREE.Group();
				const position = getSpawnPosition(globalConfig.emoteSpawnRatio);
				emotes.pos = position;
				emotes.group.position.x = position.x;
				emotes.group.position.y = position.y;
				emotes.group.position.z = position.z;

				if (position.side < 0) {
					emotes.group.rotation.y = Math.PI;
				}
				emotes.initGroup = true;
			}

			const ratio = 0.035*speedTimeRatio;
			emotes.group.position.x += emotes.pos.vx*ratio;
			emotes.group.position.y += emotes.pos.vy*ratio;
			//emotes.group.position.z += emotes.pos.vz*ratio;

			if (
				emotes.group.position.x > globalConfig.cameraDistance*2.5 || 
				emotes.group.position.x < globalConfig.cameraDistance*-2.5 || 
				emotes.group.position.y > globalConfig.cameraDistance*2.5) {
				for (let i = 0; i < emotes.emotes.length; i++) {
					const emote = emotes.emotes[i];
					emotes.group.remove(emote.sprite);
				}
				scene.remove(emotes.group);
				pendingEmoteArray.splice(index, 1);
			} else {
				emotes.progress += globalConfig.speed*globalConfig.emoteSpeedRatio*speedTimeRatio;

				for (let i = 0; i < emotes.emotes.length; i++) {
					const emote = emotes.emotes[i];

					if (emote && !emote.sprite) {
						emote.sprite = new THREE.Mesh(plane_geometry, new THREE.MeshBasicMaterial({ map: emote.texture, transparent: true, side: THREE.DoubleSide }));
						emote.sprite.position.x += i * globalConfig.emoteScale;
						emotes.group.add(emote.sprite);
					}
					if (emote && emote.sprite) {
						emote.sprite.material.needsUpdate = true;
					}
				}

				if (emotes.initGroup) {
					emotes.initGroup = false;
					scene.add(emotes.group);
				}
			}
		}

		renderer.render(scene, camera);
	}
})