## Node-webkit + THREE.js + node-ovrsdk Tutoral

* _Note: I'm using MinGW/msys here so that it's easier to make this tutorial cross-platform. You'll need to apply your preferred tools appropriately._

#### Prerequisites

* I'll assume you've checked out this repo and are in its root directory in a terminal. 
* You should have your compilers installed. Visual Studio on Windows, gcc et. al. on Linux, etc.

#### Installation

First, lets go into the app directory:

```
cd app
```

This is where you'll be organizing your app. All your assets and code should be placed here. 

Next, let's install node-ovrsdk:

```
npm install node-ovrsdk
```

This will download node-ovrsdk, place it into the app/node_modules directory, and compile some 
dependencies with node-gyp. Unfortunately, binaries compiled with node-gyp are not compatible with 
the version of node-webkit that is compatible with node-ovrsdk. We'll need to compile it with 
nw-gyp, which is a node-webkit compatible version of node-gyp. Let's first install nw-gyp globally:

```
npm install -g nw-gyp
```

Next, we'll compile the node-ovrsdk dependencies by entering their directories and running nw-gyp.
First, the ```ffi``` dependency:

```
cd node_modules/node-ovrsdk/node_modules/ffi
nw-gyp rebuild --target=0.8.6
```

Then the ```ref``` dependency:

```
cd ../ref
nw-gyp rebuild --target=0.8.6
```

Before we go on, let's go back to the app directory:

```
cd ../../../..
```

The next step is to download the 0.8.6 version of node-webkit, which is the one compatible with 
node-ovrsdk. You can find it here: https://groups.google.com/forum/#!msg/node-webkit/CLPkgfV-i7s/hwkkQuJ1kngJ

Find the download appropriate for your platform, download it, unzip it, and drop its contents into
the root of this repo (the directory above the app directory). There's definitely a better way to
organize all these files, but this will do for our purposes.

#### Building & Running

Node-webkit distributes a binary that is intended to be executed with your zipped app as a 
parameter. Let's first prepare your zipped app (remember, we are in the app/ directory):

```
zip -r ../app.nw *
```

That recursively compressed all the files in the app directory and placed them into a file named
"app.nw" one directory up, in the root of this repo. Next, we'll run the app:

```
cd ..
nw.exe app.nw
```

With any luck, you'll be presented with a view of Earth, rendered appropriately for view
in the Rift.

### The Code

Let's take a look at the important bits of the code, next.

#### index.html

First, take a look at index.html. We include, via the ```<script>``` tag, a few libraries: 

* three.min.js (THREE.js)
* OculusRiftEffect.js (for presenting the scene appropriately for the rift)
* keyboard.js (KeyboardJS, for handling keyboard events)
* main.js (our code for rendering and animating Earth)

We've also styled the body of the document so that it has no margin, ensuring we've completely
filled the screen with our rendered content. Finally, we include a canvas element with the id
```render-element```. We'll pass this along to THREE.js for rendering on later.

#### main.js

I'll leave learning how to use THREE.js as an exercise to the reader. Here I'll focus on the parts
that are specific to creating games and applications for the Rift. First, we'll look at the imports:

```javascript
var gui = require('nw.gui'),
    libovr = require("node-ovrsdk");
```

* nw.gui - an interface to node-webkit. We'll use this for interacting with the window later. 
* node-ovrsdk - the wrapper for the Oculus Rift SDK.

Now let's look at the initialization of the OVR SDK. For more details about this, please see the
SDK documentation. For now, note that we've started up the sensor so that we can access the 
orientation of the Rift while we're rendering.

```javascript
    libovr.ovr_Initialize();
    hmd = libovr.ovrHmd_Create(0);
    var desc = new libovr.ovrHmdDesc;
    libovr.ovrHmd_GetDesc(hmd, desc.ref());
    libovr.ovrHmd_StartSensor(hmd, 
                              libovr.ovrHmdCap_Orientation, 
                              libovr.ovrHmdCap_Orientation);
```

Next we create a THREE.js renderer and connect an OculusRiftEffect to it:

```javascript
    var renderCanvas = document.getElementById("render-element");
    renderer = new THREE.WebGLRenderer({
        canvas: renderCanvas,
        antialias: true
    });
    renderer.setClearColorHex(0x111111, 1);
    riftRenderer = new THREE.OculusRiftEffect(renderer);
    riftRenderer.setSize(1280, 800);
    renderCanvas.style.width = renderCanvas.style.height = "100%";
```

Note that we're setting the size of ```riftRenderer``` to 1280x800. I'm hardcoding this here for ease
and clarity, but it would be best to use node-ovrsdk to get the correct resolution. There are a
number of parameters like this, and I'll leave it to the reader to take a look at the SDK docs and
the OculusRiftEffect.js source to figure out how to handle these as they find the need. For now,
the defaults provided will work fine with DK1.

Also note that we are scaling the canvas to 100%. This is to ensure that it fills our screen.

After that comes the THREE.js scene setup, which we'll skip here. Then some keyboard events that are relevant
to us:

```javascript
    KeyboardJS.on("escape", null, function () {
        gui.App.closeAllWindows();
    });
    KeyboardJS.on("space", null, function () {
        libovr.ovrHmd_ResetSensor(hmd);
    });
```

Here we've use the escape key to exit the program and the spacebar to reset the HMD sensor, which
will recenter the scene for the viewer.

Next, we kick off the rendering loop. We'll want to adjust the THREE.js camera orientation to 
match the orientation of the Rift. Here's how we'll do that:

```javascript
    var ss = libovr.ovrHmd_GetSensorState(hmd, libovr.ovr_GetTimeInSeconds());
    var pose = ss.Predicted.Pose.Orientation;
    camera.quaternion.set(pose.x, pose.y, pose.z, pose.w);
```

Here, hmd is the ovrHmd object we created during initialization, and ovr_GetTimeInSeconds returns
a timestamp for sampling from the sensor device. With DK2 and CV1, you'll also want to get position
information. I'll update this when I get mine, but this will work for DK1 in the meantime.

Finally, we use the ```riftRenderer``` to render the scene appropriately:

```javascript
    riftRenderer.render(scene, camera);
```

#### package.json

Node-webkit uses a ```package.json``` file to define runtime parameters. Here's the hello world
package.json file in full:

```
{
    "name": "nw-demo",
    "main": "index.html",
    "chromium-args": "--disable-gpu-vsync --ignore-gpu-blacklist",
    "window": {
        "toolbar": false,
        "fullscreen": true
    }
}
```

* main - points to the html file from which our app/game will be kicked off
* chromium-args
  * --disable-gpu-vsync - Ensure we're running at a high framerate. You might want
to experiment with this.
  * --ignore-gpu-blacklist - I've had video cards that work just fine and dandy with WebGL, but
couldn't because they were blacklisted. Let's disable this so that more people can use our app/game.
* window
  * toolbar - Set this to true for easy access to the console. For production, you'll want it off.
  * fullscreen - I hope you already know what this means.

### Final notes

We're using the OculusRiftEffect code here, and it works fine for DK1, but ideally you would use
the rendering infrastructure of the SDK. I haven't tried it out or added it to node-ovrsdk yet, so
you'll have to wait a bit for that.
