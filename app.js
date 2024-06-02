import * as THREE from "./three.module.min.js";

var log = window.console.log;

export default class{

	constructor(data){
		
		var that = this;
		
		this.data = data;
		
		this.container = data.container;
		
		this.createModuls();

	}
	
	createModuls(){

		this.updater = new Updater();

		this.visual = new Visual(this);
		
		this.objects = new Objects(this,this.data.sceneParams);
		
		//this.input = new Input(this);

	}
}
class Input{
	constructor(app){
		
		this.app = app;
		
		this.addCameraMovement();
		
		this.addGyroscope();
		
	}

	addCameraMovement(){
		
		var that = this;
		
		var camera = this.app.visual.camera;
		
		var radius = 1.5;
		
		var sence = .1;
		
		var x = 0 ,y = 0;

		this.app.container.addEventListener("pointermove",(e)=>{
			
			that.thetra = ((e.pageX/innerWidth) - .5)  * 2 * sence;
			
			that.phi = ((e.pageY/innerHeight) - .5)  * 2 * sence;
			
			
		})
		
		var dump = .1;
				
		var x = 0;
		
		var y = 0;
		
		this.app.updater.add("dump_coord",()=>{
			
			x = THREE.MathUtils.lerp(x, that.thetra, dump);
			
			y = THREE.MathUtils.lerp(y, that.phi, dump);
			
	
		});

		
		this.app.updater.add("camera_move",()=>{

			camera.position.x = radius * Math.sin(x) * Math.cos(y);
		
			camera.position.y = radius * Math.sin(y);
			
			camera.position.z = radius * Math.cos(x) * Math.cos(y);

			camera.lookAt(0,0,0);
		})
	}
	
	emptyGyroCount = 10;
	
	phi = 0;
	
	thetra = 0;
	
	gyroScale = .5;
	
	addGyroscope(){
		var that = this;
		
		function handleOrientation(event) {
			
			that.emptyGyroCount--;
			
			if(that.emptyGyroCount > 0)return;
			
			that.app.updater.remove("update_coord_by_mouse");

			that.useGyroscope = true;
			
			var alpha = event.alpha;
			
			var hor = event.beta;

			var vert = event.gamma;
			
			
			if(window.screen.orientation.angle === 90){
				
				hor = event.gamma;

				vert = event.beta;
			
				hor = THREE.MathUtils.degToRad(90-Math.abs(Math.min(Math.max(event.gamma, -90), -45)));
				
				vert = THREE.MathUtils.degToRad(Math.min(Math.max(event.beta, -45), 45));
				
			
			}
			else if(window.screen.orientation.angle === 270){
				
				hor = event.gamma;

				vert = event.beta;
			
				hor = THREE.MathUtils.degToRad(90 - Math.abs(Math.min(Math.max(event.gamma, 45), 90)));
				
				vert = THREE.MathUtils.degToRad(-1 * Math.min(Math.max(event.beta, -45), 45));
			
			
			}
			else {
				hor = THREE.MathUtils.degToRad(90 -  Math.min(Math.max(hor, 0), 90))/2;

				vert = THREE.MathUtils.degToRad(Math.min(Math.max(vert, -45), 45));
			}


			that.thetra = vert * that.gyroScale;
			
			that.phi = hor * that.gyroScale;

			
		}
		
		window.addEventListener("deviceorientation", handleOrientation, false);
	}
	
}

class Visual{ // 3d - визуализация

	constructor(app){
		
		this.app = app;
		
		this.container = this.app.container;
		
		this.create();	
		
		var that = this;
		
		this.app.updater.add("render_scene",()=>{that.render()});


	}

	create(container){
		
		this.renderer = new THREE.WebGLRenderer({alpha:true,antialias:false,precision:"lowp"});
		
		this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
		
		this.renderer.autoClear = false;
		
		this.renderer.sortObjects = true;
		
		this.renderer.setClearColor( "#BABABA", 0);
	
		this.container.appendChild(this.renderer.domElement);
		
		this.renderer.domElement.id = "webgl_canvas";

		this.scene = new THREE.Scene();
		
		this.camera = new THREE.PerspectiveCamera( 45, this.container.offsetWidth / this.container.offsetHeight, .1, 1000 );
		
		this.camera.position.set(0,0,1.2);
		
		this.camera.lookAt(0,0,0);
		
		this.scene.add(this.camera);
		
		this.gammaCamera.position.set(0,0,2);
		
		this.gammaPlane = new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.ShaderMaterial(
			{
				uniforms:FXAAShader.uniforms,
				vertexShader:FXAAShader.vertexShader,
				fragmentShader:FXAAShader.fragmentShader,
				transparent:true,
			}
		));
		
		this.gammaPlane.material.uniforms.tDiffuse.value = this.gammaTarget.texture;

		//this.resize();
		
		var that = this;

		new ResizeObserver(function(){that.resize();}).observe(this.app.container);	
		
		addEventListener("orientationchange", (event) => { that.resize();});
		
	}
	delayResize(){
		
		var that = this;
		
		this.app.update.add("delay_resize",()=>{this.resize();},1);
		
	}
	resize(){
		
		var smallSide = innerHeight;
		
		if(innerWidth < innerHeight)smallSide = innerWidth;

		var pixelRatio = devicePixelRatio;
		
		var pixelRatio = 2;
		
		var scaledSize = smallSide * pixelRatio;
		
		this.renderer.setPixelRatio(pixelRatio);
		
		this.renderer.setSize(smallSide,smallSide);
		
		this.camera.aspect = 1;

		this.camera.updateProjectionMatrix();
		
		this.gammaTarget.setSize(scaledSize, scaledSize);
		
		if(this.frameTexture)this.frameTexture.dispose();
		
		this.frameTexture = new THREE.FramebufferTexture( scaledSize, scaledSize );
		
		if(this.app.objects)this.app.objects.updateFrameBlobs(this.frameTexture);
		
		this.frameTexture.image.width = this.frameTexture.image.height = scaledSize;
		
		this.gammaPlane.material.uniforms.resolution.value.set(1/scaledSize,1/scaledSize);
		
		this.renderSize = scaledSize;
		
		this.renderSize = scaledSize;
		
		if(this.app.objects)this.app.objects.renderSize.value = scaledSize;
	}
	
	needsUpdate = true;
	
	enable = true;
	
	frameVector = new THREE.Vector2();
	
	gammaTarget = new THREE.WebGLRenderTarget(512,512);
	
	gammaCamera = new THREE.OrthographicCamera(-1,1,1,-1,1,10);

	render(){
		
		if(!this.enable)return;
		
		if(!this.app.bottles)return;

		this.renderer.setRenderTarget(this.gammaTarget);
		
		this.renderer.clear();
		
		this.app.bottles.objects.visible = true;
		
		this.app.objects.blobGroup.visible = false;
		
		this.renderer.render(this.scene,this.camera);
		
		this.renderer.copyFramebufferToTexture( this.frameVector, this.frameTexture );
		
		this.app.bottles.objects.visible = false;
		
		this.app.objects.blobGroup.visible = true;

		this.renderer.render(this.scene,this.camera);
		
		this.renderer.setRenderTarget(null);

		this.renderer.render(this.gammaPlane,this.gammaCamera);

	}

	
	
}

class Updater{ // Обновление приложения

	constructor(){
		
		this.update();
	
		
	}
	pool = {};
	
	fps = 1000 / 60;
	
	time = Date.now();
	delta = 0;
	canUpdate = true;
	tries = 15;
	update(){

		var that = this;
		
		if(this.canUpdate)requestAnimationFrame(()=>{that.update();});
		
		if(this.time > Date.now())return;
		
		this.delta = (Date.now() - this.time)/1000;
		
		this.time = Date.now() + this.fps;

		for(var name in this.pool){
			
			this.pool[name].func();
			
			if(this.pool[name].steps === undefined)continue;
			
			if(this.pool[name].steps > 0)this.pool[name].steps--;
			
			if(this.pool[name].steps === 0)delete this.pool[name];
			
			
		}
		
		if(this.tries === 0)this.canUpdate = false;
		
	
	}
	add(name, func, steps){
		
		this.pool[name] = {func:func, steps:steps};
		
		func();
	}
	remove(name){
		
		delete this.pool[name];
		
	}

}

class bottles{
	constructor(app,objects){
		
		this.app = app;
		
		this.objects = objects;
		
		this.app.visual.scene.add(this.objects);
		
		this.createMaterials();
		
		this.create();
		
	}
	
	heightlightEdge = { value: 1 }
	createMaterials(){
		var globalVisible = true;
		this.bottleMaterial = new THREE.MeshStandardMaterial({
			//color:"#e26ab8",
			transparent:true,
			side:2,
			
			normalMap : this.app.objects.textures["./textures/bottle/normal_map.jpg"],
			alphaMap : this.app.objects.textures["alpha_map"],
			roughness : 1,
			roughnessMap : this.app.objects.textures["roughness_map"],
			metalness : 1,
			metalnessMap : this.app.objects.textures["metalness_map"],
			envMap : this.app.objects.textures["./textures/bottle/env_map.png"],
			visible:globalVisible,
		});
		for(var name in this.app.objects.textures){
			
			var texture = this.app.objects.textures[name];
		
			texture.colorSpace = THREE.LinearSRGBColorSpace;
			
			texture.needsUpdate = true;
		}
		this.app.objects.textures["./textures/bottle/env_map_simple.png"].mapping = THREE.EquirectangularReflectionMapping;
		this.app.objects.textures["./textures/bottle/env_map_simple.png"].needsUpdate = true;
		this.app.objects.textures["./textures/bottle/env_map.png"].mapping = THREE.EquirectangularReflectionMapping;
		this.app.objects.textures["./textures/bottle/env_map.png"].needsUpdate = true;
		
		this.titleMaterial = new THREE.MeshBasicMaterial({

			transparent:true,
			alphaTest:.001,
			color:"white",
			visible:globalVisible
		})
		
		this.liquidMaterial = new THREE.ShaderMaterial({
			uniforms:{
				normalPlane : {value: new THREE.Vector3(0,1,0)},
				positionPlane : {value: new THREE.Vector3(0,0,0)},
				alphaTexture : {value: this.app.objects.textures["alpha_map_liquid"]},
				colorTexture : {value: this.app.objects.textures["color_map_liquid_1"]},
				envMap : {value: this.app.objects.textures["./textures/bottle/env_map.png"]},
			},
			vertexShader:LiquidShader.vertexShader,
			fragmentShader:LiquidShader.fragmentShader,
			transparent:true,
			side:0,
			visible:globalVisible,
			depthTest:false,
			depthWrite:false,
			
		})

		
		this.bubblesMaterial = new THREE.ShaderMaterial( {
			uniforms:{
				heightlightEdge :this.heightlightEdge,
				envMap :{value:this.app.objects.textures["./textures/bottle/env_map_simple.png"]},
				globalMatrix :{value:new THREE.Matrix4()},
			},
			vertexShader:BubblesShader.vertexShader,
			fragmentShader:BubblesShader.fragmentShader,
			transparent:true,
			side:0,
			visible:true,
			depthTest:false,
			depthWrite:false,
			visible:false,
		} );
		
		
	}
	
	create(){
		
		this.appyMaterials("bottle_low_poly_1","./textures/bottle/stay_true_stay_you.png","color_map_pink","color_map_liquid_1",["bubble_1","bubble_2","bubble_3","bubble_4","bubble_5","bubble_6","bubble_7"]);
		
		this.appyMaterials("bottle_low_poly_2","./textures/bottle/no_boring_no_toxic.png","color_map_purple","color_map_liquid_2",["bubble_8","bubble_9","bubble_10","bubble_11","bubble_12","bubble_13","bubble_14"]);

		this.addRotation("bottle_low_poly_1",true);
		
		this.addRotation("bottle_low_poly_2",false);
		
		

	}
	appyMaterials(objectName,titleMap,colorMap,liquidMap,bubbleNames){
		
		var object = this.objects.getObjectByName(objectName);
		
		this[objectName] = object;
		
		object.renderOrder = 4;
		
		object.material = this.bottleMaterial.clone();
		
		object.material.map = this.app.objects.textures[colorMap];
		
		var title = this.app.objects.getByName("title",object);
		
		title.material = this.titleMaterial.clone();
		
		title.material.map = this.app.objects.textures[titleMap];
		
		title.material.map.minFilter = THREE.LinearFilter;
		title.material.map.magFilter = THREE.LinearFilter;
		title.material.map.needsUpdate = true;
		
		title.renderOrder = 6;
		
		var liquid = this.app.objects.getByName("liquid",object);

		liquid.material = this.liquidMaterial.clone();
		
		liquid.material.uniforms.colorTexture.value =  this.app.objects.textures[liquidMap];
		
		liquid.renderOrder = 3;
		
		this.animateSuface(liquid);

		for(var name of bubbleNames){
			return;
			var bubble = this.app.objects.getByName(name,object);

			bubble.material = this.bubblesMaterial.clone();
			
			bubble.material.uniforms.globalMatrix.value = bubble.parent.matrixWorld;
			
			bubble.renderOrder = 2;
		}
		

	}
	
	moveSpeed = 1;
	
	addRotation(objectName,direction){
		
		var that = this;
		
		var object = this.objects.getObjectByName(objectName);	

		object.updateMatrix();
		
		var vectorRotate = new THREE.Vector3(0,1,0);

		var angle = 0.01;
		
		var progress = 0;
		
		var vectorLocate = new THREE.Vector3(0,1,0);
		
		var originalPosition = object.position.clone();
	
		this.app.updater.add("_animation_"+object.name,()=>{

			progress += .002 * that.moveSpeed;
			
			var step = THREE.MathUtils.smootherstep(THREE.MathUtils.pingpong(progress,1),0,1);

			if(direction)object.rotation.y = THREE.MathUtils.lerp(-.5,.5,step);
			else object.rotation.y = THREE.MathUtils.lerp(.5,-.5,step);
			
			object.position.y = originalPosition.y + THREE.MathUtils.lerp(-.1,.1,step);
			if(direction)object.position.x = originalPosition.x + THREE.MathUtils.lerp(.01,.1,step)*step;
			else object.position.x = originalPosition.x + THREE.MathUtils.lerp(-.01,-.1,step)*step;
			
		
		})

	}
	animateSuface(object3d){

		var that = this;
		
		var surfaceNormal = object3d.material.uniforms.normalPlane.value;
		var positionPlane = object3d.material.uniforms.positionPlane.value;
		
		var velocity = new THREE.Vector3();
		
		var lastPosition = object3d.parent.position.clone();

		var angularVelocity = new THREE.Vector3();
		
		var lastRotation = new THREE.Vector3();
		
		var time = 0

		this.app.updater.add("splash_jar_"+object3d.name,()=>{
			
			
			var moveImpulse = lastPosition.sub(object3d.parent.position);
			
			if(moveImpulse.length() < .1)moveImpulse.setLength(.05);
			
			velocity.add(moveImpulse);
			
			lastPosition.copy(object3d.parent.position);
			
			var rotateImpulse = lastRotation.sub(object3d.parent.rotation);
			
			if(rotateImpulse.length() < .1)rotateImpulse.setLength(.05);
			
			angularVelocity.copy(rotateImpulse);
			
			lastRotation.copy(object3d.parent.rotation);
		
			velocity.x += angularVelocity.z;
			velocity.z += angularVelocity.x;
			
			velocity.multiplyScalar(.9);
			
			time += that.app.updater.delta;
			
			positionPlane.copy(object3d.parent.position);
			
			surfaceNormal.x = (THREE.MathUtils.pingpong(time,1)-.5)*velocity.x*.2;
			surfaceNormal.z = (THREE.MathUtils.pingpong(time,1)-.5)*velocity.z*.2;
			
		})
	}
	
}

import { FBXLoader } from './FBXLoader.js';
import * as fflate from './fflate.module.js';
class Objects { //Создание объектов
	
	rgbs = {"color_map_pink":{"r":[0.2541520943200296,0.2541520943200296,0.2541520943200296],"g":[0.21586050010324415,0.21586050010324415,0.21586050010324415],"b":[0.9473065367320066,0.5457244613615395,0.8387990117372213]},"color_map_purple":{"r":[0.2541520943200296,0.2541520943200296,0.2541520943200296],"g":[0.21586050010324415,0.21586050010324415,0.21586050010324415],"b":[0.623960391667596,0.623960391667596,0.9301108583738498]},"color_map_liquid_1":{"r":[0,0,0],"g":[0,0,0],"b":[0.913098651791473,0.7083757798856457,0.8631572134510892]},"color_map_liquid_2":{"r":[0,0,0],"g":[0,0,0],"b":[0.6795424696265424,0.6653872982754769,0.9646862478936612]},"alpha_map":{"r":[1,1,1],"g":[1,1,1],"b":[0.44,0.44,0.44]},"alpha_map_liquid":{"r":[0,0,0],"g":[0,0,0],"b":[0.36,0.36,0.36]},"roughness_map":{"r":[0.62,0.62,0.62],"g":[0.54,0.54,0.54],"b":[0.11,0.11,0.11]},"metalness_map":{"r":[0.45,0.45,0.45],"g":[0.46,0.46,0.46],"b":[0.83,0.83,0.83]}}
	params = {"visual.camera.position.z":1.21,"objects.directionalLight.intensity":0.83,"objects.directionalLight.position.x":0.93,"objects.directionalLight.position.y":0.5,"objects.ambientLight.intensity":3.45,"objects.heightlightSize.value":10,"objects.heightlightEdge.value":0.55,"bottles.moveSpeed":1.73,"objects.moveSpeed":0.42,"objects.envMapIntensity.value":0.79,"objects.envMapOffset.value":16.07,"bottles.heightlightEdge.value":1,"visual.gammaPlane.material.uniforms.finalContrast.value":1}
	
	constructor(app,sceneParams){
		
		var that = this;
		
		for(var name in sceneParams)this[name] = sceneParams[name];
		
		this.app = app;

		this.loadTextures();

	}
	createBackground(){
		
	}
	textures = {
		"./textures/perlin_noise.png":false,

		"./textures/bottle/rgb_map_512.png":false,
		"./textures/bottle/normal_map.jpg":false,
		"./textures/bottle/stay_true_stay_you.png":false,
		"./textures/bottle/no_boring_no_toxic.png":false,

		"./textures/bottle/env_map.png":false,
		"./textures/bottle/env_map_simple.png":false,

		"color_map_pink":new THREE.CanvasTexture(document.createElement("canvas")),
		"color_map_purple":new THREE.CanvasTexture(document.createElement("canvas")),
		"color_map_liquid_1":new THREE.CanvasTexture(document.createElement("canvas")),
		"color_map_liquid_2":new THREE.CanvasTexture(document.createElement("canvas")),
		"alpha_map":new THREE.CanvasTexture(document.createElement("canvas")),
		"alpha_map_liquid":new THREE.CanvasTexture(document.createElement("canvas")),
		"roughness_map":new THREE.CanvasTexture(document.createElement("canvas")),
		"metalness_map":new THREE.CanvasTexture(document.createElement("canvas")),
		
	};
	convertColor = new THREE.Color();
	
	getColor(name,type,order){
		
		if(order)return this.rgbs[name][type][0];
		
		return "#" + this.convertColor.fromArray(this.rgbs[name][type]).getHexString();
	}
	updateColor(name,type,value,order){
		
		
		if(order !== undefined){
			
			this.rgbs[name][type][0] = parseFloat(value);
			this.rgbs[name][type][1] = parseFloat(value);
			this.rgbs[name][type][2] = parseFloat(value);
			
		}
		else {
			this.convertColor.set(value);
			this.rgbs[name][type][0] = this.convertColor.r;
			this.rgbs[name][type][1] = this.convertColor.g;
			this.rgbs[name][type][2] = this.convertColor.b;
		}
		
		
		this.updateCanvasTexture(this.textures[name],this.rgbs[name]);
	}
	
	
	
	applyTextureRGB(){
		
		for(var name in this.rgbs){
			
			this.updateCanvasTexture(this.textures[name],this.rgbs[name]);
		}
		
	}
	applyParams(){
		
		for(var name in this.params)this.applyParam(name,this.params[name]);
		
	}
	applyParam(path,value){
		
		this.params[path] = parseFloat(value);
		
		var pathSteps = path.split(".");

		var newPath = this.app;
		
		for(var i = 0; i < pathSteps.length; i++){
			
			if(i < pathSteps.length-1)newPath = newPath[pathSteps[i]];
			
			else newPath[pathSteps[i]] = parseFloat(value);
		}
	}
	defaultSize = 512;
	
	getTextureData(){
		
		var canvas = document.createElement("canvas");
		
		canvas.width = canvas.height = this.defaultSize;

		var ctx = canvas.getContext("2d");
		
		ctx.drawImage(this.textures["./textures/bottle/rgb_map_512.png"].image,0,0);
		
		this.rgbData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
		
		
	}

	updateCanvasTexture(texture,rgb){
		
		texture.image.width = texture.image.height = this.defaultSize;
		
		var ctx = texture.image.getContext("2d");
		
		var imageData = ctx.createImageData(this.defaultSize,this.defaultSize);
		
		var rgbData = this.rgbData;
		
		var data = imageData.data;
		
		var r = [Math.floor(rgb.r[0] * 255),Math.floor(rgb.r[1] * 255),Math.floor(rgb.r[2] * 255)];
		var g = [Math.floor(rgb.g[0] * 255),Math.floor(rgb.g[1] * 255),Math.floor(rgb.g[2] * 255)];
		var b = [Math.floor(rgb.b[0] * 255),Math.floor(rgb.b[1] * 255),Math.floor(rgb.b[2] * 255)];
	
		var rgs = [0,0,0]
		for(var i = 0; i < data.length; i += 4){
			if(rgbData[i] > 0){
				data[i] = r[0];
				data[i+1] = r[1];
				data[i+2] = r[2];
				rgs[0]++;
			}
			else if(rgbData[i+1] > 0){
				data[i] = g[0];
				data[i+1] = g[1];
				data[i+2] = g[2];
				rgs[1]++;
			}
			else if(rgbData[i+2] > 0){
				data[i] = b[0];
				data[i+1] = b[1];
				data[i+2] = b[2];
				rgs[2]++;
			}
			data[i+3] = 255
		}
		
		ctx.putImageData(imageData,0,0);
		
		texture.needsUpdate = true;
	
		this.objects.traverse((obj)=>{

			if(obj.material){
				obj.material.needsUpdate = true;
				if(obj.material.type === "ShaderMaterial")
					for(var name in obj.material.uniforms){
						if(name === "alphaTexture")obj.material.uniforms[name].value.needsUpdate = true;
						if(name === "colorTexture")obj.material.uniforms[name].value.needsUpdate = true;
					}
						
			}
			
		})
	}
	loadTextures(){
		
		var that = this;
		
		for (var p  in this.textures)if(!this.textures[p])loadOne(p);
			
		function loadOne(path){
			new THREE.TextureLoader().load(path,(texture)=>{
				that.textures[path] = texture;
				texture.wrapS = THREE.RepeatWrapping;
				texture.wrapT = THREE.RepeatWrapping;
				checkProgress();
			})
		}
		function checkProgress(){

			for (var p  in that.textures)if(!that.textures[p])return;

			that.loadObjects();

		}
	}
	loadObjects(){
		
		var that = this;
		

		new FBXLoader().load("./objects.fbx",(objects)=>{
			
			that.objects = objects;


			that.createBlobs();
			
			that.createLight();
			
			that.getTextureData();
			
			that.applyTextureRGB();

			that.app.bottles = new bottles(that.app, objects)
			
			that.applyParams();
			
			if(that.app.data.onLoad)that.app.data.onLoad();

		});
		
		
	}
	createLight(){
		
		this.ambientLight = new THREE.AmbientLight("#e0e0e0",1);
		
		this.app.visual.scene.add(this.ambientLight);
		
		this.directionalLight = new THREE.DirectionalLight("#ffffff",1);
		
		this.directionalLight.position.set(2,0,3);
		
		this.app.visual.scene.add(this.directionalLight);
		
	}
	heightlightSize = { value: 1 }
	heightlightEdge = { value: 1 }
	envMapIntensity = { value: 1 }
	envMapOffset = { value: 1 }
	
	moveSpeed = 1;
	directions = {
		 blob018:new THREE.Vector3(0.1328261175490311, -0.051925256876132544,0),
		 blob028:new THREE.Vector3(0.0896859331282751, 0.09443481193113433,0),
		 blob010:new THREE.Vector3(0.12546801438118227, -0.04485103088636344,0),
		 blob026:new THREE.Vector3(0.06940240347682088, 0.009490740783477048,0),
		 blob024:new THREE.Vector3(0.14519401453586267, -0.05383066150050127,0),
		 blob027:new THREE.Vector3(0.04394475135168798, -0.06836995267749173,0),
		 blob035:new THREE.Vector3(0.06297192123060091, 0.06594082602996978,0),
		 blob030:new THREE.Vector3(0.045406421603515774, -0.0382263545016198,0),
		 blob021:new THREE.Vector3(0.05679019851216569, -0.008074190193391173,0),
		 blob005:new THREE.Vector3(0.1, 0.1,0),
		 blob039:new THREE.Vector3(0.01991572569402444, -0.04612210435780693,0),
		 blob025:new THREE.Vector3(0.17336122671109194, -0.029627417241307397,0),
		 blob023:new THREE.Vector3(0.10850891374330532, 0.05994858906575345,0),
		 blob032:new THREE.Vector3(0.09823697900691186, 0.09145722446508797,0),
		 blob004:new THREE.Vector3(0.10283495128442491, 0.07513714157308336,0),
		 blob029:new THREE.Vector3(0.14041635811894587, 0.007169391737296716,0),
		 blob034:new THREE.Vector3(0.17365039136201388, -0.00580773830442043,0),
		 blob016:new THREE.Vector3(-0.01052700996299521, 0.047325661371410366,0),
		 blob003:new THREE.Vector3(0.04455321271739578, 0.00969843872152154,0),
		 blob006:new THREE.Vector3(0.13295270285523667, 0.08971971812523712,0),
		 blob017:new THREE.Vector3(0.06660387493109517, -0.04084862594042465,0),
		 blob008:new THREE.Vector3(0.06262497243250886, 0.035014599630155185,0),
		 blob036:new THREE.Vector3(0.16043728718241684, 0.07081162615494203,0),
		 blob031:new THREE.Vector3(0.06330419131704555, 0.09216787769064966,0),
		 blob013:new THREE.Vector3(0.008201273882848142, 0.025536715312548752,0),
		 blob020:new THREE.Vector3(0.052754729468658584, 0.05669143009951472,0),
		 blob019:new THREE.Vector3(-0.007073236710345904, 0.021041042564352175,0),
		 blob002:new THREE.Vector3(0.0579053830328548, 0.002427873950784143,0),
		 blob022:new THREE.Vector3(0.053004274264748234, -0.06791057465103215,0),
		 blob:new THREE.Vector3(-0.1, 0.1,0),
		 blob015:new THREE.Vector3(0.14252755103871254, 0.01755412447962015,0),
		 blob012:new THREE.Vector3(0.0921774275277288, 0.06958920057650593,0),
		 blob009:new THREE.Vector3(0.10503632265645176, -0.028581600317328884,0),
		 blob007:new THREE.Vector3(0.13331777429088482, -0.06469882749265232,0),
		 blob014:new THREE.Vector3(0.024045511930348845, -0.08702581401077114,0),
		 blob033:new THREE.Vector3(0.048012115852166755, 0.009548518504903526,0),
		 blob001:new THREE.Vector3(-0.1, -0.1,0),
		 blob038:new THREE.Vector3(0.17233718201935114, 0.06803510155676498,0),
		 blob037:new THREE.Vector3(0.1195719121116589, -0.08392579984180651,0),
		 blob011:new THREE.Vector3(0.0008098429157334663, -0.0188871981643298,0),
	}
	getByName(name,object){
		
		for(var obj of object.children)if(obj.name.indexOf(name) >= 0)return obj;
		
	}
	
	renderSize = {value : 0}
	updateFrameBlobs(texture){
		
		if(!this.blobs)return;
		
		for(var blob of this.blobs){
			
			blob.material.uniforms.prevFrame.value = texture;
			
			blob.material.needsUpdate = true;
			
		}
	}
	createBlobs(){

		var that = this;
		
		this.blobs = [];
		
		this.blobGroup = new THREE.Group();
		
		var blob;
		
		this.renderSize.value = this.app.visual.renderSize;
		
		this.blobMaterial = new THREE.ShaderMaterial({
				uniforms:{
					'prevFrame': { value: this.app.visual.frameTexture },
					'perlinNoice': { value: this.textures["./textures/perlin_noise.png"] },
					
					'envMap': { value: this.textures["./textures/bottle/env_map_simple.png"] },
					'perlinOffset': { value: Math.random() },
					'renderSize': this.renderSize,
					'opacity': { value: 0.5 },
					'heightlightSize': that.heightlightSize,
					'heightlightEdge': that.heightlightSize,
					'envMapIntensity': that.envMapIntensity,
					'envMapOffset': that.envMapOffset,
					'refractFactor': {value:1},
					
				},
				vertexShader:WaterBallShader.vertexShader,
				fragmentShader:WaterBallShader.fragmentShader,
				side:2,
				
				
		});
		
		while (blob = this.getByName("blob",this.objects)){
			
			
			blob.material = this.blobMaterial.clone();
			
			if(!blob.geometry.boundingSphere)blob.geometry.computeBoundingSphere();
			
			blob.material.uniforms.renderSize = this.renderSize;
			blob.material.uniforms.refractFactor.value = blob.geometry.boundingSphere.radius * blob.scale.x;
			blob.material.uniforms.heightlightSize = this.heightlightSize;
			blob.material.uniforms.heightlightEdge = this.heightlightEdge;
			blob.material.uniforms.envMapIntensity = this.envMapIntensity;
			blob.material.uniforms.envMapOffset = this.envMapOffset;
			blob.material.uniforms.perlinOffset.value = this.directions[blob.name].x;

			this.blobs.push(blob);
			
			if(this.directions[blob.name])blob.randomDirection = this.directions[blob.name];
			else blob.randomDirection = new THREE.Vector2((Math.random()-.1)* .2,(Math.random()-.5)* .2);
			
			if(this.directions[blob.name])blob.progress = (Math.random() < 0.5 ? -.5 : .5);
			else blob.progress = Math.random();
			
			 blob.progress = .5;
			
			blob.originalPosition = blob.position.clone();
			
			blob.originalScale = blob.scale.clone();
			
			if(this.directions[blob.name])blob.offsetScale = blob.scale.clone().multiplyScalar(.55);
			else blob.offsetScale = blob.scale.clone().multiplyScalar(.25);
			
			blob.scalePingPong = new THREE.Vector3().copy(this.directions[blob.name]).multiplyScalar(10);

			this.blobGroup.add(blob);
		}
		
		this.app.visual.scene.add(this.blobGroup);
		
		this.app.updater.add("update_blobs",()=>{
			
			var first = true;
	
			for(var blob of this.blobs){
				
				blob.material.uniforms.perlinOffset.value += .0002;
				
				blob.progress += .01 * that.moveSpeed;
				
				blob.scalePingPong.addScalar(.015 * that.moveSpeed);
				
				blob.scale.set(
					
					blob.originalScale.x*.85 + THREE.MathUtils.smootherstep(THREE.MathUtils.pingpong(blob.scalePingPong.x,1),0,1)*blob.offsetScale.x,
					blob.originalScale.y*.85 + THREE.MathUtils.smootherstep(THREE.MathUtils.pingpong(blob.scalePingPong.y,1),0,1)*blob.offsetScale.y,
					blob.originalScale.z*.86 + THREE.MathUtils.smootherstep(THREE.MathUtils.pingpong(blob.scalePingPong.z,1),0,1)*blob.offsetScale.z,
				)
				
				blob.rotation.z += THREE.MathUtils.smootherstep(THREE.MathUtils.pingpong(blob.progress,1),0,1)*.002;
				
				blob.position.x = blob.originalPosition.x + (THREE.MathUtils.smootherstep(THREE.MathUtils.pingpong(blob.progress,1),0,1) - .5)*blob.randomDirection.x;
				
				blob.position.y = blob.originalPosition.y + (THREE.MathUtils.smootherstep(THREE.MathUtils.pingpong(blob.progress,1),0,1) - .5)*blob.randomDirection.y;

				
			}
			
		})
	}
}

const WaterBallShader = {

	name: 'WaterBallShader',


	vertexShader: /* glsl */`

		varying vec2 vUv;
		
		varying vec3 vPositionW;
		
		varying vec3 vNormalW;
		
		varying vec3 flowDirection;
		
		uniform float perlinOffset;

		uniform sampler2D perlinNoice;
		

		
		void main() {

			vUv = uv;

			vec4 noiceOffset = texture2D( perlinNoice, (vUv*.3 + perlinOffset*.2) * 1.);

			vec3 flowPosition = position;
			
			vPositionW = vec3( vec4( position, 1.0 ) * modelMatrix);
			
			vNormalW = normalize( vec3( vec4( normal, 0.0 ) * modelMatrix ) );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position + position*(noiceOffset.r*.2), 1.0 );

		}`,

	fragmentShader: /* glsl */`

		uniform float perlinOffset;
		
		uniform float renderSize;
		
		uniform float heightlightSize;
		uniform float heightlightEdge;
		
		uniform float envMapIntensity;
		uniform float envMapOffset;
		
		uniform float refractFactor;

		uniform sampler2D perlinNoice;
		
		uniform sampler2D prevFrame;
		
		uniform sampler2D envMap;

		varying vec2 vUv;
		
		varying vec3 vPositionW;
		
		varying vec3 vNormalW;
		
		float PI = 3.14;
		
		vec2 sphericalCoordinates(vec3 normal) {
			
		  float phi = atan(normal.z, normal.x);
		  
		  float theta = acos(normal.y) + .5;
		  
		  float u = phi / (2.0 * PI);
		  
		  float v = theta / PI;

		  return vec2(u, v);
		  
		}
		
		void main() {
			
			gl_FragColor = vec4(1.,1.,1.,1.);

			vec4 noiceOffset ;
			
			/*REFRACTION*/
			
				vec2 globalCoord = vec2(gl_FragCoord.x/renderSize, gl_FragCoord.y/renderSize);
			
				noiceOffset = texture2D( perlinNoice, vec2((globalCoord.x + perlinOffset)*2.,globalCoord.y*2.) );
				
				gl_FragColor = texture2D( prevFrame, vec2(globalCoord.x + noiceOffset.r*.5*refractFactor,globalCoord.y + noiceOffset.r*refractFactor*.5) );

				gl_FragColor += noiceOffset*.01;	
			
			/*REFRACTION*/
			
			/*REFLECTION*/
			
				vec3 envDirectionW = normalize(cameraPosition - vPositionW*envMapOffset);
				
				envDirectionW *= envDirectionW;

				vec2 envUv = sphericalCoordinates(envDirectionW);
				
				vec3 envColor =  texture2D( envMap, envUv + noiceOffset.r*.05 ).rgb;
				
				gl_FragColor.rgb -= .5;
				
				gl_FragColor.rgb += envColor*envMapIntensity;
				
			/*REFLECTION*/
			
			/*HIGHTLIGHT*/
				vec3 viewDirectionW = normalize(cameraPosition - vPositionW);
	
				vec3 lightDir = vec3(-2.,2.,3.);
				
				lightDir = normalize(lightDir);
				
				vec3 reflectDir = reflect(-lightDir, vNormalW);
				
				float specularStrength = pow(max(dot(viewDirectionW, reflectDir), 0.0), heightlightSize);
				
				float fresnelTerm = dot(viewDirectionW, vNormalW);
	
				fresnelTerm = clamp(1.0 - fresnelTerm, -.99, .99);

				gl_FragColor.rgb -= .1;
				
				vec3 color = vec3(1., 1., 1.) * fresnelTerm * heightlightEdge;
				
				gl_FragColor.rgb += (color*color*color);
				
				gl_FragColor.rgb += specularStrength*.1;
				
				gl_FragColor.a += .05*fresnelTerm*fresnelTerm ;
			
			/*HIGHTLIGHT*/
			
			
			
			
			

		}`

};
const LiquidShader = {

	name: 'LiquidShader',

	vertexShader :`
	
		varying  float surface;
		
		varying  float nDot;
		
		varying vec2 vUv;
			
		uniform  vec3 normalPlane;
		
		uniform  vec3 positionPlane;
		
		varying vec3 vPositionW;
	
		void main() {
			
			vUv = uv;
			
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			
			vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
			
			surface = dot(worldPosition.rgb - positionPlane ,normalPlane);
			
			vPositionW = vec3( vec4( position, 1.0 ) * modelMatrix);
		}
	`,
	fragmentShader :`
	
		varying vec2 vUv;
		
		varying  float surface;
		
		varying  float nDot;
		
		uniform sampler2D alphaTexture;
		
		uniform sampler2D colorTexture;
		
		uniform sampler2D envMap;
		
		varying vec3 vPositionW;
		
			float PI = 3.14;
		
		vec2 sphericalCoordinates(vec3 normal) {
			
		  float phi = atan(normal.z, normal.x);
		  
		  float theta = acos(normal.y) + .5;
		  
		  float u = phi / (2.0 * PI);
		  
		  float v = theta / PI;

		  return vec2(u, v);
		  
		}
		
		void main() {
			
			if(surface > 0.0)discard;
	
			gl_FragColor.a = texture2D( alphaTexture, vUv).r;
			
			gl_FragColor.rgb = texture2D( colorTexture, vUv).rgb;
			
			int REFLECTION = 1;
			
			/*REFLECTION*/
			if(REFLECTION == 1){
				
				vec3 vPosnW = vPositionW;

				vec3 envDirectionW = normalize(cameraPosition - vPosnW*10.0);

				gl_FragColor.rgb -= .5 ;
				
				gl_FragColor.rgb = texture2D( envMap, sphericalCoordinates(envDirectionW) ).rgb*.5 ;
				gl_FragColor.a += .1 ;
				
			}
			/*REFLECTION*/
			
		}
	`
};
const BubblesShader = {

	name: 'BubblesShader',

	vertexShader: /* glsl */`

		varying vec2 vUv;
		
		varying vec3 vPositionW;
		
		varying vec3 vNormalW;
		
		uniform mat4 globalMatrix;
		
		void main() {

			vUv = uv;
			
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			
			vPositionW = vec3( vec4( position, 1.0 ) * -modelMatrix);
			
			vNormalW = normalize( vec3( vec4( normal, 0.0 ) * -modelMatrix) );

			
		}`,

	fragmentShader: /* glsl */`

		uniform sampler2D tDiffuse;
		
		uniform sampler2D envMap;
		
		uniform float heightlightEdge;
		

		varying vec2 vUv;
		
		varying vec3 vPositionW;
		
		varying vec3 vNormalW;
		
		float PI = 3.14;
		
		vec2 sphericalCoordinates(vec3 normal) {
			
		  float phi = atan(normal.z, normal.x);
		  
		  float theta = acos(normal.y) + .5;
		  
		  float u = phi / (2.0 * PI);
		  
		  float v = theta / PI;

		  return vec2(u, v);
		  
		}
		
		void main() {
			
			gl_FragColor = vec4(1.0);

			int REFLECTION = 1;
			int HIGHTLIGHT = 0;
			vec3 camPosition = vec3(0,0,2.);
			if(REFLECTION == 1){
				/*REFLECTION*/
				
				vec3 envDirectionW = normalize(cameraPosition - vPositionW*10.0);

				gl_FragColor.rgb -= .5 ;
				gl_FragColor.rgb += texture2D( envMap, sphericalCoordinates(envDirectionW) ).rgb*.5 ;

				/*REFLECTION*/
			}
			if(HIGHTLIGHT == 1){
				/*HIGHTLIGHT*/
				vec3 viewDirectionW = normalize(cameraPosition - vPositionW);
				
				float fresnelTerm = dot(viewDirectionW, vNormalW);
				
				fresnelTerm = clamp(1.0 - fresnelTerm, 0.0, .99);

				float color = fresnelTerm * heightlightEdge;
				
				//color = color * color * color;

				gl_FragColor.rgb = vec3(color);
				gl_FragColor.rgb = vNormalW;

				/*HIGHTLIGHT*/
			}
			
			//gl_FragColor = vec4(1.0,0,0,1.0);
			
		}`

};
const GammaShader = {

	name: 'GammaShader',

	uniforms: {

		'tDiffuse': { value: null },
		'opacity': { value: 1.0 }

	},

	vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: /* glsl */`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;
			gl_FragColor.r *= 10.;


		}`

};
var FXAAShader = {

		uniforms: {

			'tDiffuse': { value: null },
			'resolution': { value: new THREE.Vector2( 1 / 1024, 1 / 512 ) },
			'finalContrast': { value: 1 },

		},

		vertexShader: /* glsl */`

			varying vec2 vUv;

			void main() {

				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

			}`,

		fragmentShader: `
		precision highp float;

		uniform sampler2D tDiffuse;

		uniform vec2 resolution;
		
		uniform float finalContrast;

		varying vec2 vUv;

		// FXAA 3.11 implementation by NVIDIA, ported to WebGL by Agost Biro (biro@archilogic.com)

		//----------------------------------------------------------------------------------
		// File:        es3-kepler\FXAA\assets\shaders/FXAA_DefaultES.frag
		// SDK Version: v3.00
		// Email:       gameworks@nvidia.com
		// Site:        http://developer.nvidia.com/
		//
		// Copyright (c) 2014-2015, NVIDIA CORPORATION. All rights reserved.
		//
		// Redistribution and use in source and binary forms, with or without
		// modification, are permitted provided that the following conditions
		// are met:
		//  * Redistributions of source code must retain the above copyright
		//    notice, this list of conditions and the following disclaimer.
		//  * Redistributions in binary form must reproduce the above copyright
		//    notice, this list of conditions and the following disclaimer in the
		//    documentation and/or other materials provided with the distribution.
		//  * Neither the name of NVIDIA CORPORATION nor the names of its
		//    contributors may be used to endorse or promote products derived
		//    from this software without specific prior written permission.
		//
		// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS ''AS IS'' AND ANY
		// EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
		// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
		// PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
		// CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
		// EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
		// PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
		// PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
		// OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
		// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
		// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
		//
		//----------------------------------------------------------------------------------

		#ifndef FXAA_DISCARD
				//
				// Only valid for PC OpenGL currently.
				// Probably will not work when FXAA_GREEN_AS_LUMA = 1.
				//
				// 1 = Use discard on pixels which don't need AA.
				//     For APIs which enable concurrent TEX+ROP from same surface.
				// 0 = Return unchanged color on pixels which don't need AA.
				//
				#define FXAA_DISCARD 0
		#endif

		/*--------------------------------------------------------------------------*/
		#define FxaaTexTop(t, p) texture2D(t, p, -100.0)
		#define FxaaTexOff(t, p, o, r) texture2D(t, p + (o * r), -100.0)
		/*--------------------------------------------------------------------------*/

		#define NUM_SAMPLES 5

		// assumes colors have premultipliedAlpha, so that the calculated color contrast is scaled by alpha
		float contrast( vec4 a, vec4 b ) {
				vec4 diff = abs( a - b );
				return max( max( max( diff.r, diff.g ), diff.b ), diff.a );
		}

		/*============================================================================

										FXAA3 QUALITY - PC

		============================================================================*/

		/*--------------------------------------------------------------------------*/
		vec4 FxaaPixelShader(
				vec2 posM,
				sampler2D tex,
				vec2 fxaaQualityRcpFrame,
				float fxaaQualityEdgeThreshold,
				float fxaaQualityinvEdgeThreshold
		) {
				vec4 rgbaM = FxaaTexTop(tex, posM);
				vec4 rgbaS = FxaaTexOff(tex, posM, vec2( 0.0, 1.0), fxaaQualityRcpFrame.xy);
				vec4 rgbaE = FxaaTexOff(tex, posM, vec2( 1.0, 0.0), fxaaQualityRcpFrame.xy);
				vec4 rgbaN = FxaaTexOff(tex, posM, vec2( 0.0,-1.0), fxaaQualityRcpFrame.xy);
				vec4 rgbaW = FxaaTexOff(tex, posM, vec2(-1.0, 0.0), fxaaQualityRcpFrame.xy);
				// . S .
				// W M E
				// . N .

				bool earlyExit = max( max( max(
						contrast( rgbaM, rgbaN ),
						contrast( rgbaM, rgbaS ) ),
						contrast( rgbaM, rgbaE ) ),
						contrast( rgbaM, rgbaW ) )
						< fxaaQualityEdgeThreshold;
				// . 0 .
				// 0 0 0
				// . 0 .

				#if (FXAA_DISCARD == 1)
						if(earlyExit) FxaaDiscard;
				#else
						if(earlyExit) return rgbaM;
				#endif

				float contrastN = contrast( rgbaM, rgbaN );
				float contrastS = contrast( rgbaM, rgbaS );
				float contrastE = contrast( rgbaM, rgbaE );
				float contrastW = contrast( rgbaM, rgbaW );

				float relativeVContrast = ( contrastN + contrastS ) - ( contrastE + contrastW );
				relativeVContrast *= fxaaQualityinvEdgeThreshold;

				bool horzSpan = relativeVContrast > 0.;
				// . 1 .
				// 0 0 0
				// . 1 .

				// 45 deg edge detection and corners of objects, aka V/H contrast is too similar
				if( abs( relativeVContrast ) < .3 ) {
						// locate the edge
						vec2 dirToEdge;
						dirToEdge.x = contrastE > contrastW ? 1. : -1.;
						dirToEdge.y = contrastS > contrastN ? 1. : -1.;
						// . 2 .      . 1 .
						// 1 0 2  ~=  0 0 1
						// . 1 .      . 0 .

						// tap 2 pixels and see which ones are "outside" the edge, to
						// determine if the edge is vertical or horizontal

						vec4 rgbaAlongH = FxaaTexOff(tex, posM, vec2( dirToEdge.x, -dirToEdge.y ), fxaaQualityRcpFrame.xy);
						float matchAlongH = contrast( rgbaM, rgbaAlongH );
						// . 1 .
						// 0 0 1
						// . 0 H

						vec4 rgbaAlongV = FxaaTexOff(tex, posM, vec2( -dirToEdge.x, dirToEdge.y ), fxaaQualityRcpFrame.xy);
						float matchAlongV = contrast( rgbaM, rgbaAlongV );
						// V 1 .
						// 0 0 1
						// . 0 .

						relativeVContrast = matchAlongV - matchAlongH;
						relativeVContrast *= fxaaQualityinvEdgeThreshold;

						if( abs( relativeVContrast ) < .3 ) { // 45 deg edge
								// 1 1 .
								// 0 0 1
								// . 0 1

								// do a simple blur
								return mix(
										rgbaM,
										(rgbaN + rgbaS + rgbaE + rgbaW) * .25,
										.4
								);
						}

						horzSpan = relativeVContrast > 0.;
				}

				if(!horzSpan) rgbaN = rgbaW;
				if(!horzSpan) rgbaS = rgbaE;
				// . 0 .      1
				// 1 0 1  ->  0
				// . 0 .      1

				bool pairN = contrast( rgbaM, rgbaN ) > contrast( rgbaM, rgbaS );
				if(!pairN) rgbaN = rgbaS;

				vec2 offNP;
				offNP.x = (!horzSpan) ? 0.0 : fxaaQualityRcpFrame.x;
				offNP.y = ( horzSpan) ? 0.0 : fxaaQualityRcpFrame.y;

				bool doneN = false;
				bool doneP = false;

				float nDist = 0.;
				float pDist = 0.;

				vec2 posN = posM;
				vec2 posP = posM;

				int iterationsUsed = 0;
				int iterationsUsedN = 0;
				int iterationsUsedP = 0;
				for( int i = 0; i < NUM_SAMPLES; i++ ) {
						iterationsUsed = i;

						float increment = float(i + 1);

						if(!doneN) {
								nDist += increment;
								posN = posM + offNP * nDist;
								vec4 rgbaEndN = FxaaTexTop(tex, posN.xy);
								doneN = contrast( rgbaEndN, rgbaM ) > contrast( rgbaEndN, rgbaN );
								iterationsUsedN = i;
						}

						if(!doneP) {
								pDist += increment;
								posP = posM - offNP * pDist;
								vec4 rgbaEndP = FxaaTexTop(tex, posP.xy);
								doneP = contrast( rgbaEndP, rgbaM ) > contrast( rgbaEndP, rgbaN );
								iterationsUsedP = i;
						}

						if(doneN || doneP) break;
				}


				if ( !doneP && !doneN ) return rgbaM; // failed to find end of edge

				float dist = min(
						doneN ? float( iterationsUsedN ) / float( NUM_SAMPLES - 1 ) : 1.,
						doneP ? float( iterationsUsedP ) / float( NUM_SAMPLES - 1 ) : 1.
				);

				// hacky way of reduces blurriness of mostly diagonal edges
				// but reduces AA quality
				dist = pow(dist, .5);

				dist = 1. - dist;

				return mix(
						rgbaM,
						rgbaN,
						dist * .5
				);
		}

		void main() {
				
				vec4 texel = texture2D( tDiffuse, vUv );
				
				gl_FragColor = texel;
				
				gl_FragColor.rgb = ((gl_FragColor.rgb - vec3(0.5)) * finalContrast) + vec3(0.5);
	
				return;
				
				const float edgeDetectionQuality = .2;
				const float invEdgeDetectionQuality = 1. / edgeDetectionQuality;

				gl_FragColor = FxaaPixelShader(
						vUv,
						tDiffuse,
						resolution,
						edgeDetectionQuality, // [0,1] contrast needed, otherwise early discard
						invEdgeDetectionQuality
				);
				

				gl_FragColor.rgb = ((gl_FragColor.rgb - vec3(0.5)) * finalContrast) + vec3(0.5);
		}	
		`

	};
