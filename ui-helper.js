// element selectors
const sourceVideo = document.querySelector('video');
const loader = document.getElementById('loader');
const dialog = document.getElementById('dialog');

// Stats panel
const userMessage = document.querySelector('#userMessage');
const showStats = document.querySelector('#statsDiv');

const touchesDisplay = document.querySelector('#touches');
const lastTouchDisplay = document.querySelector('#lastTouch');
const perHourDisplay = document.querySelector('#perHour');
const fpsDisplay = document.querySelector('#fps');

// controls
const resetButton = document.querySelector('button#reset');

// Model control buttons
const fastButton = document.querySelector('button#highSpeed');
const normalButton = document.querySelector('button#normalSpeed');
const slowerButton = document.querySelector('button#lowerSpeed');
const slowButton = document.querySelector('button#lowSpeed');

fastButton.disabled = true;
normalButton.disabled = true;
slowerButton.disabled = true;
slowButton.disabled = true;

const videoWidth = sourceVideo.offsetWidth;
const videoHeight = sourceVideo.offsetHeight;
sourceVideo.style.filter = "blur(0.5rem)";

// Get video camera
function handleSuccess(stream) {
    const video = document.querySelector('video');
    console.log(`Using video device: ${stream.getVideoTracks()[0].label}`);
    video.srcObject = stream;
}

function handleError(error) {
    if (error.name === 'ConstraintNotSatisfiedError') {
        console.error(`The resolution requested is not supported by your device.`);
    } else if (error.name === 'PermissionDeniedError') {
        console.error("User denied access to media devices");
    }
    console.error(`getUserMedia error: ${error.name}`, error);
}

document.querySelector('#start').addEventListener('click', e => {
    document.querySelector('#content').hidden = true;
    resetButton.style.display = "block";

    loader.style.display = "block";

    document.querySelector("div#usageNoteSide").innerHTML = document.querySelector('#usageNoteMain').innerHTML;
    navigator.mediaDevices.getUserMedia({
        video: {
            width:  videoWidth,
            height: videoHeight
        }
    })
        .then(handleSuccess)
        .catch(handleError)
});

// Refresh page
resetButton.addEventListener('click', e => window.location.reload());

// Initialize the dashboard
function enableDashboard(initial=false) {

    userMessage.innerText = "Monitor running";
    showStats.hidden = false;
    loader.style.display = "none";
    sourceVideo.style.filter = "blur(0)";

    startTime = new Date().getTime();

    if(initial){
        fastButton.disabled = false;
        normalButton.disabled = false;
        slowerButton.disabled = false;
        slowButton.disabled = false;
    }

    firstRun = false;
}


// Update stats
let touches = 0;
let lastFrameTime = new Date().getTime();
let lastTouchTime = false;
let lastTouchStatus = false;
let startTime;

var xhr = new XMLHttpRequest();

function updateStats(touched) {

    // FPS display
    let now = new Date().getTime();
    let fps = 1000 / (now - lastFrameTime);

    lastFrameTime = now;
    fpsDisplay.innerText = fps.toFixed(1);

    // Touch counter
    if (touched && lastTouchStatus === false) {
        touches++;

        // send request to trigger twitter bot
        xhr.open("POST", 'http://localhost:3000/touchFaceTweetCringe', true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.send("");
        handleDialog("You touched your face! The cringe tweet bot has been triggered and your reputation is ruined.");
        dialog.addEventListener('click', e => {
            dialog.style.display = "none";
        });
    }

    lastTouchStatus = touched;
    touchesDisplay.innerText = touches;

    if(touches > 10) {
        handleDialog("Listen, you touched your face so many times the bot has run out of cringe tweets.\nThat's it. You are a lost cause.");
        dialog.addEventListener('click', e => {
            window.location.reload();
        });
    }

    // Last Touch timer
    if (touched)
        lastTouchTime = now;
    if (lastTouchTime) {
        lastTouchDisplay.innerHTML = ((now - lastTouchTime) / 1000).toFixed(0) + " sec ago";

        // 1 / ((new Date().getTime() - startTime)/(60*1000*60))
        let touchRate = (touches / ((now - startTime) / (60 * 60 * 1000))).toFixed(2);
        perHourDisplay.innerHTML = touchRate;
    } else {
        lastTouchDisplay.innerHTML = "None yet";
    }
}

// Dialog
function handleDialog(dialogText) {
    dialog.style.display = "block";
    document.getElementById('dialogText').innerHTML = dialogText; 
}

// Beep tone
function beep(tone, duration) {
    let audioCtx = new AudioContext;
    let oscillator = audioCtx.createOscillator();
    oscillator.frequency.value = tone;
    oscillator.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration / 1000);
}

fastButton.addEventListener('click', e => {
    fastButton.disabled = true;
    normalButton.disabled = false;
    slowerButton.disabled = false;
    slowButton.disabled = false;
    stopPrediction = true;
    load(0.5, 16);
});

normalButton.addEventListener('click', e => {
    fastButton.disabled = false;
    normalButton.disabled = true;
    slowerButton.disabled = false;
    slowButton.disabled = false;
    stopPrediction = true;
    load(0.75, 16);
});

slowerButton.addEventListener('click', e => {
    fastButton.disabled = false;
    normalButton.disabled = false;
    slowerButton.disabled = true;
    slowButton.disabled = false;
    stopPrediction = true;
    load(.75, 8);
});

slowButton.addEventListener('click', e => {
    fastButton.disabled = false;
    normalButton.disabled = false;
    slowerButton.disabled = false;
    slowButton.disabled = true;
    stopPrediction = true;
    load(1, 8);
});