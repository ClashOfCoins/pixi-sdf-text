import * as dat from 'dat.gui';
import * as PIXI from 'pixi.js';
import * as FontGeometryGenerator from './FontGeometryGenerator';

const loadFont = require('load-bmfont');
const createLayout = require('layout-bmfont-text');
const createIndices = require('quad-indices');

const gui = new dat.GUI();

const guiParams = {
	drawUV: false,
	drawDistance: false,
	scale: 1,
	buffer: 0.3,
	outlineSize: 0.2
};

const app = new PIXI.Application({width: window.innerWidth, height: window.innerHeight, backgroundColor: 0x888888});
document.body.appendChild(app.view);

init();

async function init() {
	const font = await loadFNT();

	const mesh = createTextMesh(font, 'Lorem ipsum dolor sit amet');
	mesh.position.set(app.screen.width / 2 - mesh.width / 2, app.screen.height / 2);
	app.stage.addChild(mesh);

	app.ticker.add(() => {
		mesh.material.uniforms.drawUV = guiParams.drawUV;
		mesh.material.uniforms.drawDistance = guiParams.drawDistance;
		mesh.material.uniforms.smoothing = 0.1 / guiParams.scale;
		mesh.material.uniforms.buffer = guiParams.buffer;
		mesh.material.uniforms.outlineSize = guiParams.outlineSize;
		mesh.scale.set(guiParams.scale, guiParams.scale);
		mesh.position.set(app.screen.width / 2 - mesh.width / 2, app.screen.height / 2);
	});

	gui.add(guiParams, 'drawUV').name('Show UV');
	gui.add(guiParams, 'drawDistance').name('Show distance field');
	gui.add(guiParams, 'scale', 0.1, 10).name('Text scale');
	gui.add(guiParams, 'buffer', 0, 0.5).name('SDF buffer');
	gui.add(guiParams, 'outlineSize', 0, 1).name('Outline width');
}

async function loadFNT() {
	return new Promise((resolve) => {
		loadFont('roboto.fnt', (error, font) => {
			resolve(font);
		});
	});
}

function createTextMesh(font, text) {
	const layout = createLayout({
		font,
		text: text,
		letterSpacing: 1,
		align: 'left',
	});

	const positions = FontGeometryGenerator.getPositions(layout.glyphs);
	const uvs = FontGeometryGenerator.getUvs(layout.glyphs, 512, 256, false);
	const indices = createIndices([], {
		clockwise: true,
		type: 'uint16',
		count: layout.glyphs.length,
	});

	const geometry = new PIXI.Geometry();

	geometry.addAttribute('position', positions, 2);
	geometry.addAttribute('uv', uvs, 2);
	geometry.addIndex(indices);

	const vert = `
	precision mediump float;
	attribute vec2 position;
	attribute vec2 uv;
	
	varying vec2 vUv;

	uniform mat3 translationMatrix;
	uniform mat3 projectionMatrix;

	void main() {
		vUv = uv;
		gl_Position = vec4((projectionMatrix * translationMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
	}`;

	const frag = `
	precision mediump float;
	
	varying vec2 vUv;
	
	uniform sampler2D tSDF;
	uniform bool drawUV;
	uniform bool drawDistance;
	
	uniform vec3 textColor;
	uniform vec3 outlineColor;
	uniform float smoothing;
	uniform float buffer;
	uniform float opacity;
	uniform float outlineSize;
	
	void main() {
		float distance = texture2D(tSDF, vUv).a;
		float alpha = smoothstep(buffer - smoothing, buffer + smoothing, distance);
		float border = smoothstep(buffer + outlineSize - smoothing, buffer + outlineSize + smoothing, distance);
		gl_FragColor = vec4(mix(outlineColor, textColor, border), 1.) * alpha * opacity;
		//gl_FragColor = vec4(textColor, 1) * alpha * opacity;
		
		if(drawUV) gl_FragColor = vec4(vUv, 0, 1);
		if(drawDistance) gl_FragColor = vec4(distance);
	}
	`;

	const material = PIXI.Shader.from(vert, frag, {
		tSDF: PIXI.Texture.from('roboto.png'),
		textColor: [1, 1, 1],
		outlineColor: [0.1, 0.1, 0.1],
		smoothing: 0.1,
		buffer: 0.1,
		outlineSize: 0.1,
		opacity: 1,
		drawUV: false,
		drawDistance: false
	});

	return new PIXI.Mesh(geometry, material);
}
