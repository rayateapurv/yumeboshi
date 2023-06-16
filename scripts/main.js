import { OrbitControls } from "https://cdn.skypack.dev/three@0.133.1/examples/jsm/controls/OrbitControls.js";
import * as dat from "https://cdn.skypack.dev/dat.gui";
import * as statsJs from "https://cdn.skypack.dev/stats.js";
import { createNoise3D } from "https://cdn.skypack.dev/simplex-noise@4.0.0";

//console.log(THREE);
const noise3D = createNoise3D();

//audio visualisation by distorting mesh using the WebAudio API
//helpful article on the process to do this by Prakhar Bharadwaj linked here
//https://medium.com/@mag_ops/music-visualiser-with-three-js-web-audio-api-b30175e7b5ba

let file = document.querySelector("#thefile");
let audio = document.querySelector("#audio");
let fileLabel = document.querySelector("label.file");
let originalSrc = document.querySelector("#audioSource");
let context;

document.onload = function (e) {
  console.log(e);
  audio.play();
  play();
};

file.onchange = function () {
  fileLabel.classList.add("normal");
  audio.classList.add("active");
  let files = this.files;
  console.log(files);

  audio.src = URL.createObjectURL(files[0]);
  audio.load();
  audio.play();
  play();
};

function play() {
  //here comes the webgl
  const scene = new THREE.Scene();
  const group = new THREE.Group();
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 50);
  camera.lookAt(scene.position);
  scene.add(camera);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  context = new AudioContext();

  let src = context.createMediaElementSource(audio);
  let analyser = context.createAnalyser();
  src.connect(analyser);
  analyser.connect(context.destination);
  analyser.fftSize = 512;
  let bufferLength = analyser.frequencyBinCount;
  let dataArray = new Uint8Array(bufferLength);

  let effectController = {
    //ball1
    //colors
    b1r: 0.0,
    b1g: 0.0,
    b1b: -0.3,
    b1dr: 0.6,
    b1dg: -0.6,
    b1db: 0.0,

    //wireframe
    b1wf: false,

    //noise
    b1noi: 5.0,

    //ball2
    //colors
    b2r: -0.7,
    b2g: 0.0,
    b2b: 0.0,
    b2dr: 0.0,
    b2dg: 0.0,
    b2db: 1.0,

    //wireframe
    b2wf: false,

    //noise
    b2noi: 5.0,

    //general
    //blur intensity
    blurint: 0.75,
  };

  const icosahedronGeometry = new THREE.IcosahedronGeometry(10, 5);
  const icosahedronGeometry2 = new THREE.IcosahedronGeometry(3, 3);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      time: { type: "f", value: 0 },
      seed: { type: "f", value: 10.0 },
      red: { type: "f", value: 0.0 },
      green: { type: "f", value: 0.0 },
      blue: { type: "f", value: -0.3 },
      redmix: { type: "f", value: 0.6 },
      greenmix: { type: "f", value: -0.6 },
      bluemix: { type: "f", value: 0.0 },
      noisepercent: { type: "f", value: 5.0 },
    },
    vertexShader: document.querySelector("#vertShader").textContent,
    fragmentShader: document.querySelector("#fragShader").textContent,
  });
  mat.wireframe = effectController.b1wf;

  const mat2 = new THREE.ShaderMaterial({
    uniforms: {
      time: { type: "f", value: 0 },
      seed: { type: "f", value: 20.0 },
      red: { type: "f", value: -0.7 },
      green: { type: "f", value: 0.0 },
      blue: { type: "f", value: 0.0 },
      redmix: { type: "f", value: 0.0 },
      greenmix: { type: "f", value: 0.0 },
      bluemix: { type: "f", value: 1.0 },
      noisepercent: { type: "f", value: 5.0 },
    },
    vertexShader: document.querySelector("#vertShader").textContent,
    fragmentShader: document.querySelector("#fragShader").textContent,
  });
  mat2.wireframe = effectController.b2wf;

  const ball = new THREE.Mesh(icosahedronGeometry, mat);
  ball.position.set(0, 0, 0);
  //console.log(ball);
  group.add(ball);

  const ball2 = new THREE.Mesh(icosahedronGeometry2, mat2);
  ball2.position.set(7, 7, 0);
  group.add(ball2);

  const baseTexture = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBFormat,
    }
  );

  const glowTexture = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBFormat,
    }
  );

  const zoomBlurShader = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { type: "t", value: 0, texture: glowTexture },
      resolution: {
        type: "v2",
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
      strength: { type: "f", value: effectController.blurint },
    },
    vertexShader: document.querySelector("#vertShaderZoom").textContent,
    fragmentShader: document.querySelector("#fragShaderZoom").textContent,

    depthWrite: false,
  });

  const compositeShader = new THREE.ShaderMaterial({
    uniforms: {
      tBase: { type: "t", value: 0, texture: baseTexture },
      tGlow: { type: "t", value: 1, texture: glowTexture },
    },
    vertexShader: document.querySelector("#vertShaderComp").textContent,
    fragmentShader: document.querySelector("#fragShaderComp").textContent,

    depthWrite: false,
  });

  const orthoScene = new THREE.Scene();
  const orthoCamera = new THREE.OrthographicCamera(
    1 / -2,
    1 / 2,
    1 / 2,
    1 / -2,
    0.00001,
    1000
  );
  const orthoQuad = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    zoomBlurShader
  );
  orthoScene.add(orthoQuad);

  //const ambientLight = new THREE.AmbientLight(0xaaaaaa);
  //scene.add(ambientLight);

  // const spotLight = new THREE.SpotLight(0xffffff);
  // spotLight.intensity = 0.9;
  // spotLight.position.set(-10, 40, 20);
  // spotLight.lookAt(ball);
  // spotLight.castShadow = true;
  // scene.add(spotLight);

  // const light = new THREE.PointLight( 0xff0000, 1, 100 );
  // scene.add( light );

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 15;
  controls.maxDistance = 80;
  // orbitControls.autoRotate = true;

  scene.add(group);

  //GUI

  const gui = new dat.GUI({ width: 300 });

  let f1 = gui.addFolder("Large Blob Controls");

  f1.add(effectController, "b1r", -1.0, 1.0, 0.1).name("red to cyan").listen();
  f1.add(effectController, "b1g", -1.0, 1.0, 0.1)
    .name("green to magenta")
    .listen();
  f1.add(effectController, "b1b", -1.0, 1.0, 0.1)
    .name("blue to yellow")
    .listen();

  f1.add(effectController, "b1dr", -1.0, 1.0, 0.1)
    .name("red/cyan mix")
    .listen();
  f1.add(effectController, "b1dg", -1.0, 1.0, 0.1)
    .name("green/magenta mix")
    .listen();
  f1.add(effectController, "b1db", -1.0, 1.0, 0.1)
    .name("blue/yellow mix")
    .listen();

  f1.add(effectController, "b1noi", 0.0, 15.0, 0.5)
    .name("noise density")
    .listen();
  f1.add(effectController, "b1wf").name("wireframe").listen();

  let f2 = gui.addFolder("Small Blob Controls");

  f2.add(effectController, "b2r", -1.0, 1.0, 0.1).name("red to cyan").listen();
  f2.add(effectController, "b2g", -1.0, 1.0, 0.1)
    .name("green to magenta")
    .listen();
  f2.add(effectController, "b2b", -1.0, 1.0, 0.1)
    .name("blue to yellow")
    .listen();

  f2.add(effectController, "b2dr", -1.0, 1.0, 0.1)
    .name("red/cyan mix")
    .listen();
  f2.add(effectController, "b2dg", -1.0, 1.0, 0.1)
    .name("green/magenta mix")
    .listen();
  f2.add(effectController, "b2db", -1.0, 1.0, 0.1)
    .name("blue/yellow mix")
    .listen();

  f2.add(effectController, "b2noi", 0.0, 15.0, 0.5)
    .name("noise density")
    .listen();
  f2.add(effectController, "b2wf").name("wireframe").listen();

  let f3 = gui.addFolder("General Controls");
  f3.add(effectController, "blurint", 0.0, 1.0, 0.1)
    .name("blur intensity")
    .listen();

  // let stats = new statsJs.Stats();
  // document.body.appendChild( stats.dom );

  document.getElementById("out").appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize, false);

  let start = Date.now();

  render();

  function render() {
    analyser.getByteFrequencyData(dataArray);

    let lowerHalfArray = dataArray.slice(0, dataArray.length / 2 - 1);
    let upperHalfArray = dataArray.slice(
      dataArray.length / 2 - 1,
      dataArray.length - 1
    );

    let overallAvg = avg(dataArray);
    let lowerMax = max(lowerHalfArray);
    let lowerAvg = avg(lowerHalfArray);
    let upperMax = max(upperHalfArray);
    let upperAvg = avg(upperHalfArray);

    let lowerMaxFr = lowerMax / lowerHalfArray.length;
    let lowerAvgFr = lowerAvg / lowerHalfArray.length;
    let upperMaxFr = upperMax / upperHalfArray.length;
    let upperAvgFr = upperAvg / upperHalfArray.length;

    distortMesh(
      ball2,
      modulate(lowerAvg, 0, 0.7, 0, 0.05),
      modulate(upperAvgFr, 0, 1, 0, 1.5),
      0.4
    );
    distortMesh(
      ball,
      modulate(Math.pow(lowerMaxFr, 0.8), 0, 1.0, 0, 0.5),
      Math.pow(upperMaxFr, 0.8),
      0.7
    );

    group.rotation.y += 0.002;
    //renderer.render(scene, camera);

    mat.uniforms["time"].value = 0.00025 * (Date.now() - start);
    mat.uniforms["red"].value = effectController.b1r;
    mat.uniforms["green"].value = effectController.b1g;
    mat.uniforms["blue"].value = effectController.b1b;
    mat.uniforms["redmix"].value = effectController.b1dr;
    mat.uniforms["greenmix"].value = effectController.b1dg;
    mat.uniforms["bluemix"].value = effectController.b1db;
    mat.uniforms["noisepercent"].value = effectController.b1noi;
    mat.wireframe = effectController.b1wf;

    mat2.uniforms["time"].value = 0.00025 * (Date.now() - start);
    mat2.uniforms["red"].value = effectController.b2r;
    mat2.uniforms["green"].value = effectController.b2g;
    mat2.uniforms["blue"].value = effectController.b2b;
    mat2.uniforms["redmix"].value = effectController.b2dr;
    mat2.uniforms["greenmix"].value = effectController.b2dg;
    mat2.uniforms["bluemix"].value = effectController.b2db;
    mat2.uniforms["noisepercent"].value = effectController.b2noi;
    mat2.wireframe = effectController.b2wf;

    zoomBlurShader.uniforms["strength"].value = effectController.blurint;

    renderer.render(scene, camera, baseTexture, true);
    orthoQuad.material = zoomBlurShader;
    orthoQuad.material.uniforms["tDiffuse"].value = baseTexture.texture;
    renderer.render(orthoScene, orthoCamera, glowTexture, false);

    orthoQuad.material = compositeShader;
    orthoQuad.material.uniforms["tBase"].value = baseTexture.texture;
    orthoQuad.material.uniforms["tGlow"].value = glowTexture.texture;

    renderer.render(orthoScene, orthoCamera);
    requestAnimationFrame(render);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function distortMesh(mesh, bassFr, treFr, intensity) {
    mesh.geometry.vertices.forEach(function (vertex, i) {
      let offset = mesh.geometry.parameters.radius;
      let amp = 7;
      let time = window.performance.now();
      vertex.normalize();
      let rf = 0.00001;
      let distance =
        offset +
        bassFr +
        noise3D(
          vertex.x + time * rf * 8,
          vertex.y + time * rf * 7,
          vertex.z + time * rf * 8
        ) *
          amp *
          treFr;
      vertex.multiplyScalar(distance * intensity);
    });
    mesh.geometry.verticesNeedUpdate = true;
    mesh.geometry.normalsNeedUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeFaceNormals();
  }

  //audio.play();
}

play();
window.addEventListener("click", () => {
  context.resume();
});

//helper functions
function fractionate(val, minVal, maxVal) {
  return (val - minVal) / (maxVal - minVal);
}

function modulate(val, minVal, maxVal, outMin, outMax) {
  let fr = fractionate(val, minVal, maxVal);
  let delta = outMax - outMin;
  return outMin + fr * delta;
}

function avg(arr) {
  let total = arr.reduce(function (sum, b) {
    return sum + b;
  });
  return total / arr.length;
}

function max(arr) {
  return arr.reduce(function (a, b) {
    return Math.max(a, b);
  });
}
