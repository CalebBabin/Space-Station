import * as THREE from 'three';

import Chat from 'twitch-chat';

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
})

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

	cameraDistance: 25,
	cameraFar: 30,
}

const plane_geometry = new THREE.PlaneBufferGeometry(globalConfig.emoteScale, globalConfig.emoteScale);

const getSpawnPosition = () => {
	const side = Math.random() > 0.5 ? -1 : 1;
	return {
		x: globalConfig.cameraDistance*side,
		y: Math.random()*10-5,
		z: (Math.random() > 0.5 ? -1 : 1)*globalConfig.cameraDistance/4,
		vx: side*-1,
		vy: (Math.random()-0.5)/4,
		vz: (Math.random()-0.5)/2,
		side,
	}
}

window.addEventListener('DOMContentLoaded', () => {
	let camera, scene, renderer;


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

		const speedTimeRatio = (Date.now() - lastFrame) / 16;
		lastFrame = Date.now();

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
				emotes.group.position.x > globalConfig.cameraDistance*2 || 
				emotes.group.position.x < globalConfig.cameraDistance*-2 || 
				emotes.group.position.y > globalConfig.cameraDistance*2) {
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