"use strict";

var gui = require('nw.gui'),
    libovr = require("node-ovrsdk");

var scene,
    camera,
    renderer,
    riftRenderer,
    planetMesh,
    gui,
    hmd;


window.onload = function () {

    // Initialize the Rift.
    libovr.ovr_Initialize();
    hmd = libovr.ovrHmd_Create(0);
    var desc = new libovr.ovrHmdDesc;
    libovr.ovrHmd_GetDesc(hmd, desc.ref());
    libovr.ovrHmd_StartSensor(hmd, libovr.ovrHmdCap_Orientation, libovr.ovrHmdCap_Orientation);

    // Initialize the THREE.js renderer.
    var renderCanvas = document.getElementById("render-element");
    renderer = new THREE.WebGLRenderer({
        canvas: renderCanvas,
        antialias: true
    });
    renderer.setClearColorHex(0x111111, 1);
    riftRenderer = new THREE.OculusRiftEffect(renderer);
    riftRenderer.setSize(1280, 800);
    renderCanvas.style.width = renderCanvas.style.height = "100%";

    // Initialize the THREE.js scene.
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1280 / 800, 0.01, 1000);
    camera.position.z = 3;

    var sphereGeometry = new THREE.IcosahedronGeometry(2, 5);

    var diffuse = new THREE.ImageUtils.loadTexture('earth.jpg');
    diffuse.wrapS = THREE.RepeatWrapping;
    var material = new THREE.MeshPhongMaterial({map: diffuse, specular: 0x000000});
    planetMesh = new THREE.Mesh(sphereGeometry, material);
    scene.add(planetMesh);

    var light = new THREE.PointLight();
    light.position.set(10, 10, 10);
    scene.add(light);

    // Handle keyboard events.
    KeyboardJS.on("escape", null, function () {
        gui.App.closeAllWindows();
    });
    KeyboardJS.on("space", null, function () {
        libovr.ovrHmd_ResetSensor(hmd);
    });

    // Kick off the animation loop.
    animate();
}


function animate(dt) {
    requestAnimationFrame(animate);
    planetMesh.rotation.y = dt * 0.0001;
    var ss = libovr.ovrHmd_GetSensorState(hmd, libovr.ovr_GetTimeInSeconds());
    var pose = ss.Predicted.Pose.Orientation;
    camera.quaternion.set(pose.x, pose.y, pose.z, pose.w);
    riftRenderer.render(scene, camera);
}
