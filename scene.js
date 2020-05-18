var canvas = document.getElementById('renderCanvas');

var engine = null;
var scene = null;
var sceneToRender = null;
var createDefaultEngine = function() { return new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }); };

var createScene = function () {

    // This creates a basic Babylon Scene object (non-mesh)
    var scene = new BABYLON.Scene(engine);

    // This creates and positions a free camera (non-mesh)
    var camera = new BABYLON.ArcRotateCamera('arcR', Math.PI/2, Math.PI/2, 15, BABYLON.Vector3.Zero(), scene);

    // This attaches the camera to the canvas
    camera.attachControl(canvas, true);

    // createVideoModel(scene, 0);
    //console.log(VideoPlane);
    return scene;

};

var createVideoModel = function (scene, streamId, isLocal) {
  var video = document.createElement('video');
  video.id = 'agoraVideo_' + streamId;
  video.setAttribute('webkit-playsinline', 'webkit-playsinline');
  video.setAttribute('playsinline', 'playsinline');
  video.src ='textures/test.mp4';
  // add video object to the DOM
  document.querySelector('canvas').appendChild(video);
 
  // create the 3D model that will appear as the background for the video model
  var backgroundName = 'agoraVideoBackground_' + streamId;
  var videoBackground = BABYLON.MeshBuilder.CreateBox(backgroundName, {width: 7.646700, height: 5.726200, depth: 0.100000 }, scene);
  

  if (streamCount <= 1) {
    // videoBackground.position = BABYLON.Vector3.Zero();
    videoBackground.position = new BABYLON.Vector3(-5, 0, 0);
  } else {
    videoBackground.position = new BABYLON.Vector3(5, 0, 0);
  }
  var backgroundMateriaName = 'agoraVideoBackgroundMaterial_' + streamId;
  var videoBackgroundMaterial = new BABYLON.StandardMaterial(backgroundMateriaName,scene);
  videoBackgroundMaterial.diffuseColor = new BABYLON.Color4(0, 0, 0, 1);
  videoBackground.material = videoBackgroundMaterial;

  // Create the 2D plane that will be use to display the video texture
  var planeName = 'agoraVideoPlane_' + streamId;
  var planeYRotation = Math.PI; // rotate plane to display video correctly
  var planeOpts = {
    height: 5.4762, 
    width: 7.3967, 
    sideOrientation: BABYLON.Mesh.FRONTSIDE
  };  

  if (isLocal) {
    planeOpts.sideOrientation = BABYLON.Mesh.BACKSIDE // display local video mirrored 
    planeYRotation = 0; // no need to flip mirrored video 
  }
  var videoPlane = BABYLON.MeshBuilder.CreatePlane(planeName, planeOpts, scene);
  videoPlane.rotation.y = planeYRotation;
  var vidPos = (new BABYLON.Vector3(0,0,0.1)).addInPlace(videoBackground.position);
  videoPlane.position = vidPos;
  // create the material  
  var materialName =  'agoraVideoMaterial_' + streamId;
  var videoMaterial = new BABYLON.StandardMaterial(materialName, scene);
  
  // create the video texture
  var texturelName =  'agoraVideoTexture_' + streamId;
  var videoTexture = new BABYLON.VideoTexture(texturelName,video, scene, false, false);
  // set video texture as the src of the video material diffuse
  videoMaterial.diffuseTexture = videoTexture;
  videoMaterial.roughness = 1;
  videoMaterial.emissiveColor = new BABYLON.Color3.White();
  // assign video material as source for video plane material
  videoPlane.material = videoMaterial;
  
  scene.onPointerObservable.add(function(evt){
    if(evt.pickInfo.pickedMesh === videoPlane){
      console.log('clicked video plane');
    }
  }, BABYLON.PointerEventTypes.POINTERPICK);
};

// create Babylon Engine.
try {
  engine = createDefaultEngine();
  } catch(e) {
  console.log('the available createEngine function failed. Creating the default engine instead');
  engine = createDefaultEngine();
  }
  if (!engine) throw 'engine should not be null.';
  scene = createScene();;
  sceneToRender = scene
  
  engine.runRenderLoop(function () {
      if (sceneToRender) {
          sceneToRender.render();
      }
  });
  
  // Resize
  window.addEventListener('resize', function () {
      engine.resize();
  });



// Agora settings
const agoraAppId = '4fdfd402ce0a45ea94d850f2124f0b36'; // insert Agora AppID here
const channelName = 'Babylonjsdemo'; 
var streamCount = 0;

// video profile settings
var cameraVideoProfile = '720p_6'; // 960 × 720 @ 30fps  & 750kbs

// set log level:
// -- .DEBUG for dev 
// -- .NONE for prod
AgoraRTC.Logger.setLogLevel(AgoraRTC.Logger.DEBUG); 

// keep track of streams
var localStreams = {
  uid: '',
  camera: {
    camId: '',
    micId: '',
    stream: {}
  },
  screen: {
    id: '',
    stream: {}
  }
};

// keep track of devices
var devices = {
  cameras: [],
  mics: []
}

// Agora RTC client 
var client = AgoraRTC.createClient({mode: 'live', codec: 'vp8'}); // vp8 to work across mobile devices

client.init(agoraAppId, () => {
  console.log('AgoraRTC client initialized');
  joinChannel(); // join channel upon successfull init
}, function (err) {
  console.log('[ERROR] : AgoraRTC client init failed', err);
});

client.on('stream-published', function (evt) {
  console.log('Publish local stream successfully');
});

// connect remote streams
client.on('stream-added', (evt) => {
  const stream = evt.stream;
  const streamId = stream.getId();
  console.log('New stream added: ' + streamId);
  console.log('Subscribing to remote stream:' + streamId);
  // Subscribe to the remote stream
  client.subscribe(stream, (err) => {
    console.log('[ERROR] : subscribe stream failed', err);
  });

  streamCount++; // Increase count of Active Stream Count
  createVideoModel(scene, streamId); // Load 3D model with video texture
});

client.on('stream-removed', (evt) => {
  const stream = evt.stream;
  stream.stop(); // stop the stream
  stream.close(); // clean up and close the camera stream
  console.log('Remote stream is removed ' + stream.getId());
});

client.on('stream-subscribed', (evt) => {
  const remoteStream = evt.stream;
  const remoteId = remoteStream.getId();
  console.log('Successfully subscribed to remote stream: ' + remoteStream.getId());
  
  // get the designated video element and connect it to the remoteStream
  var video = document.getElementById('agoraVideo_' + remoteId);
  connectStreamToVideo(remoteStream, video); 
});

// remove the remote-container when a user leaves the channel
client.on('peer-leave', (evt) => {
  console.log('Remote stream has left the channel: ' + evt.uid);
  evt.stream.stop(); // stop the stream
  const remoteId = evt.stream.getId();
  // Remove the 3D and Video elements that were created
  document.getElementById('agoraVideo_' + remoteId).remove();
  streamCount--;  // Decrease count of Active Stream Count
});

// show mute icon whenever a remote has muted their mic
client.on('mute-audio', (evt) => {
  console.log('mute-audio for: ' + evt.uid);
});

client.on('unmute-audio', (evt) => {
  console.log('unmute-audio for: ' + evt.uid);
});

// show user icon whenever a remote has disabled their video
client.on('mute-video', (evt) => {
  console.log('mute-video for: ' + evt.uid);
});

client.on('unmute-video', (evt) => {
  console.log('unmute-video for: ' + evt.uid);
});

// join a channel
function joinChannel() {
  const token = generateToken();
  
  client.join(token, channelName, 0, (uid) => {
      console.log('User ' + uid + ' join channel successfully');
      localStreams.uid = uid
      streamCount = 1;
      createVideoModel(scene, uid, true);   // Load 3D model with video texture
      createCameraStream(uid);  // Create the camera stream
  }, (err) => {
      console.log('[ERROR] : join channel failed', err);
  });
}

function leaveChannel() {

  client.leave(() => {
    console.log('client leaves channel');
    localStreams.camera.stream.stop()   // stop the camera stream playback
    localStreams.camera.stream.close(); // clean up and close the camera stream
    client.unpublish(localStreams.camera.stream); // unpublish the camera stream
    //disable the UI elements
    $('#mic-btn').prop('disabled', true);
    $('#video-btn').prop('disabled', true);
    $('#exit-btn').prop('disabled', true);
  }, (err) => {
    console.log('client leave failed ', err); //error handling
  });
}

// video streams for channel
function createCameraStream(uid) {
  
  const localStream = AgoraRTC.createStream({
    streamID: uid,
    audio: true,
    video: true,
    screen: false
  });

  localStream.setVideoProfile(cameraVideoProfile);

  // The user has granted access to the camera and mic.
  localStream.on('accessAllowed', () => {
    if(devices.cameras.length === 0 && devices.mics.length === 0) {
      console.log('[DEBUG] : checking for cameras & mics');
      getCameraDevices();
      getMicDevices();
    }
    console.log('accessAllowed');
  });
  // The user has denied access to the camera and mic.
  localStream.on('accessDenied', () => {
    console.log('accessDenied');
  });

  localStream.init(() => {
    console.log('getUserMedia successfully');
    // Coonect the local stream video to the video texture
    var video = document.getElementById('agoraVideo_' + uid);
    connectStreamToVideo(localStream, video);
    enableUiControls(localStream);
    // publish local stream
    client.publish(localStream, (err) => {
      console.log('[ERROR] : publish local stream error: ' + err);
    });
    // keep track of the camera stream for later
    localStreams.camera.stream = localStream; 
  }, (err) => {
    console.log('[ERROR] : getUserMedia failed', err);
  });
}

function connectStreamToVideo(agoraStream, video) {
  video.srcObject = agoraStream.stream;// add video stream to video element as source
  video.onloadedmetadata = () => {
    // ready to play video
    video.play();
  }
}

function changeStreamSource (deviceIndex, deviceType) {
  console.log('Switching stream sources for: ' + deviceType);
  var deviceId;
  
  if (deviceType === 'video') {
    deviceId = devices.cameras[deviceIndex].deviceId
  } else if(deviceType === 'audio') {
    deviceId = devices.mics[deviceIndex].deviceId;
  }

  localStreams.camera.stream.switchDevice(deviceType, deviceId, () => {
    console.log('successfully switched to new device with id: ' + JSON.stringify(deviceId));
    // set the active device ids
    if(deviceType === 'audio') {
      localStreams.camera.micId = deviceId;
    } else if (deviceType === 'video') {
      localStreams.camera.camId = deviceId;
    } else {
      console.log('unable to determine deviceType: ' + deviceType);
    }
  }, () => {
    console.log('failed to switch to new device with id: ' + JSON.stringify(deviceId));
  });
}

// helper methods
function getCameraDevices() {
  console.log('Checking for Camera Devices.....')
  client.getCameras ((cameras) => {
    devices.cameras = cameras; // store cameras array
    cameras.forEach((camera, i) => {
      const name = camera.label.split('(')[0];
      const optionId = 'camera_' + i;
      const deviceId = camera.deviceId;
      if(i === 0 && localStreams.camera.camId === ''){
        localStreams.camera.camId = deviceId;
      }
      $('#camera-list').append('<a class=\'dropdown-item\' id= ' + optionId + '>' + name + '</a>');
    });
    $('#camera-list a').click((event) => {
      const index = event.target.id.split('_')[1];
      changeStreamSource (index, 'video');
    });
  });
}

function getMicDevices() {
  console.log('Checking for Mic Devices.....')
  client.getRecordingDevices((mics) => {
    devices.mics = mics; // store mics array
    mics.forEach((mic, i) => {
      let name = mic.label.split('(')[0];
      const optionId = 'mic_' + i;
      const deviceId = mic.deviceId;
      if(i === 0 && localStreams.camera.micId === ''){
        localStreams.camera.micId = deviceId;
      }
      if(name.split('Default - ')[1] != undefined) {
        name = '[Default Device]' // rename the default mic - only appears on Chrome & Opera
      }
      $('#mic-list').append('<a class=\'dropdown-item\' id= ' + optionId + '>' + name + '</a>');
    }); 
    $('#mic-list a').click((event) => {
      const index = event.target.id.split('_')[1];
      changeStreamSource (index, 'audio');
    });
  });
}

// use tokens for added security
function generateToken() {
  return null; // TODO: add a token generation
}

// UI controls
function enableUiControls() {

  $('#mic-btn').prop('disabled', false);
  $('#video-btn').prop('disabled', false);
  $('#exit-btn').prop('disabled', false);

  $('#mic-btn').click(() => {
    toggleMic();
  });

  $('#video-btn').click(() => {
    toggleVideo();
  });

  $('#exit-btn').click(() => {
    console.log('so sad to see you leave the channel');
    leaveChannel(); 
  });

  // keyboard listeners 
  $(document).keypress((e) => {
    switch (e.key) {
      case 'm':
        console.log('squick toggle the mic');
        toggleMic();
        break;
      case 'v':
        console.log('quick toggle the video');
        toggleVideo();
        break; 
      case 'q':
        console.log('so sad to see you quit the channel');
        leaveChannel(); 
        break;
    }
  });
}

function toggleBtn(btn){
  btn.toggleClass('btn-dark').toggleClass('btn-danger');
}

function toggleMic() {
  toggleBtn($('#mic-btn')); // toggle button colors
  toggleBtn($('#mic-dropdown'));
  $('#mic-icon').toggleClass('fa-microphone').toggleClass('fa-microphone-slash'); // toggle the mic icon
  if ($('#mic-icon').hasClass('fa-microphone')) {
    localStreams.camera.stream.unmuteAudio(); // enable the local mic
  } else {
    localStreams.camera.stream.muteAudio(); // mute the local mic
  }
}

function toggleVideo() {
  toggleBtn($('#video-btn')); // toggle button colors
  toggleBtn($('#cam-dropdown'));
  if ($('#video-icon').hasClass('fa-video')) {
    localStreams.camera.stream.muteVideo(); // enable the local video
    console.log('muteVideo');
  } else {
    localStreams.camera.stream.unmuteVideo(); // disable the local video
    console.log('unMuteVideo');
  }
  $('#video-icon').toggleClass('fa-video').toggleClass('fa-video-slash'); // toggle the video icon
}