const frequencyDisplayElement = document.querySelector('#frequency');

function drawLine(data, y) {
  var canvas = document.getElementById('visualizer');
  var canvasWidth = canvas.width;
  var canvasHeight = canvas.height;
  var ctx = canvas.getContext('2d');
  var canvasData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

  // That's how you define the value of a pixel
  function drawPixel(x, y, r, g, b, a) {
    var index = (x + y * canvasWidth) * 4;

    canvasData.data[index + 0] = r;
    canvasData.data[index + 1] = g;
    canvasData.data[index + 2] = b;
    canvasData.data[index + 3] = a;
  }

  // for (var i = 0; i < canvasWidth; i++) {
  //   drawPixel(y, i, data[i] * 1000, 50, 50, 255);
  // }

  drawPixel(y, data, 255, 0, 0, 255);

  updateCanvas();

  // That's how you update the canvas, so that your
  // modification are taken in consideration
  function updateCanvas() {
    ctx.putImageData(canvasData, 0, 0);
  }
}

function startPitchDetection() {
  let counterY = 0;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  microphoneStream = null;
  analyserNode = audioCtx.createAnalyser();
  audioData = new Float32Array(analyserNode.fftSize);
  corrolatedSignal = new Float32Array(analyserNode.fftSize);
  localMaxima = new Array(10);
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      microphoneStream = audioCtx.createMediaStreamSource(stream);
      microphoneStream.connect(analyserNode);

      audioData = new Float32Array(analyserNode.fftSize);
      dataArrayAlt = new Uint8Array(analyserNode.frequencyBinCount);
      corrolatedSignal = new Float32Array(analyserNode.fftSize);

      setInterval(() => {
        analyserNode.getFloatTimeDomainData(audioData);
        // analyserNode.getByteFrequencyData(dataArrayAlt);
        let pitch = yin(audioData, audioCtx.sampleRate);
        if (pitch > 65) drawLine(Math.ceil(pitch), ++counterY % 1024);

        console.log(Math.max(...audioData));

        //let pitch = yin(audioData, audioCtx.sampleRate);

        frequencyDisplayElement.innerHTML = `${pitch}`;
      }, 100);
    })
    .catch((err) => {
      console.log(err);
    });
}

function getAutocorrolatedPitch(fftSize, data) {
  // First: autocorrolate the signal

  let maximaCount = 0;

  for (let l = 0; l < fftSize; l++) {
    corrolatedSignal[l] = 0;
    for (let i = 0; i < fftSize - l; i++) {
      corrolatedSignal[l] += data[i] * data[i + l];
    }
    if (l > 1) {
      if (
        corrolatedSignal[l - 2] - corrolatedSignal[l - 1] < 0 &&
        corrolatedSignal[l - 1] - corrolatedSignal[l] > 0
      ) {
        localMaxima[maximaCount] = l - 1;
        maximaCount++;
        if (maximaCount >= localMaxima.length) break;
      }
    }
  }

  // Second: find the average distance in samples between maxima

  let maximaMean = localMaxima[0];

  for (let i = 1; i < maximaCount; i++)
    maximaMean += localMaxima[i] - localMaxima[i - 1];

  maximaMean /= maximaCount;

  return audioCtx.sampleRate / maximaMean;
}
