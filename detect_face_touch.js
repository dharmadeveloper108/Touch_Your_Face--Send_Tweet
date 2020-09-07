// Global flags
const flipHorizontal = true;
let stopPrediction = false;
let isPlaying = false,
    gotMetadata = false;
let firstRun = true;

// check if metadata is ready - we need the sourceVideo size
sourceVideo.onloadedmetadata = () => {
    console.log("video metadata ready");
    gotMetadata = true;
    if (isPlaying)
        load()
};

// Check if the sourceVideo has started playing
sourceVideo.onplaying = () => {
    console.log("video playing");
    isPlaying = true;
    if (gotMetadata) {
        load()
    }
};

function load(multiplier=0.75, stride=16) {
    sourceVideo.width = videoWidth;
    sourceVideo.height = videoHeight;

    userMessage.innerText = "Waiting for Machine Learning model to load...";

    console.log(`loading BodyPix with multiplier ${multiplier} and stride ${stride}`);

    bodyPix.load({multiplier: multiplier, stride: stride, quantBytes: 4})
        .then(net => predictLoop(net))
        .catch(err => console.error(err));
}

async function predictLoop(net) {

    stopPrediction = false;

    let lastFaceArray = new Int32Array(sourceVideo.width * sourceVideo.height);
    let alerts = 0;
    let alertTimeout = false;

    enableDashboard(firstRun); // Show the dashboard

    // Timer to update the face mask
    let updateFace = true;
    setInterval(() => {
        updateFace = !updateFace;
    }, 1500);

    while (isPlaying && !stopPrediction) {

        // BodyPix setup
        const segmentPersonConfig = {
            flipHorizontal: flipHorizontal,     // Flip for webcam
            maxDetections: 1,                   // only look at one person in this model
            scoreThreshold: 0.5,
            segmentationThreshold: 0.6,         // default is 0.7
        };
        const segmentation = await net.segmentPersonParts(sourceVideo, segmentPersonConfig);

        const faceThreshold = 0.9;
        const touchThreshold = 0.01;

        const numPixels = segmentation.width * segmentation.height;

        // skip if noting is there
        if (segmentation.allPoses[0] === undefined) {
            // console.info("No segmentation data");
            continue;
        }

        // Verify there is a good quality face before doing anything
        // I am assuming a consistent array order
        let nose = segmentation.allPoses[0].keypoints[0].score > faceThreshold;
        let leftEye = segmentation.allPoses[0].keypoints[1].score > faceThreshold;
        let rightEye = segmentation.allPoses[0].keypoints[2].score > faceThreshold;

        // Check for hands if there is a nose or eyes
        if (nose && (leftEye || rightEye)) {

            // Look for overlaps where the hand is and the face used to be

            // Create an array of just face values
            let faceArray = segmentation.data.map(val => {
                if (val === 0 || val === 1) return val;
                else return -1;
            });

            // Get the hand array
            let handArray = segmentation.data.map(val => {
                if (val === 10 || val === 11) return val;
                else return -1;
            });

            let facePixels = 0;
            let score = 0;

            for (let x = 0; x < lastFaceArray.length; x++) {

                // Count the number of face pixels
                if (lastFaceArray[x] > -1)
                    facePixels++;

                // If the hand is overlapping where the face used to be
                if (lastFaceArray[x] > -1 && handArray[x] > -1)
                    score++;
            }

            let multiFaceArray = arrayToMatrix(faceArray, segmentation.width);
            let multiHandArray = arrayToMatrix(handArray, segmentation.width);
            let touchScore = touchingCheck(multiFaceArray, multiHandArray, 10);
            score += touchScore;

            // Update the old face according to the timer
            if (updateFace)
                lastFaceArray = faceArray;

            updateStats(alertTimeout);

            // Handle alerts
            if (score > facePixels * touchThreshold && !alertTimeout) {
                console.info(` numPixels: ${numPixels} \n facePixels: ${facePixels}\n score: ${score}, touchScore: ${touchScore}\n` +
                    ` facePixels%: ${facePixels / numPixels}\n touch%: ${score / facePixels}`);
                alerts++;
                console.log("alert!!!", alerts);

                // User alerts
                beep(350, 150, 0);
                
                alertTimeout = true;

                setTimeout(() => {
                    console.log("resuming alerts");
                    alertTimeout = false;
                }, 1000)
            }
        }
    }
}

// Checks if there is a face pixel above, below, left or right to this pixel
function touchingCheck(matrix1, matrix2, padding) {
    let count = 0;
    for (let y = padding; y < matrix1.length - padding; y++)
        for (let x = padding; x < matrix1[0].length - padding; x++) {
            if (matrix1[y][x] > -1) {
                for (let p = 0; p < padding; p++) {
                    // if the hand is left or right, above or below the current face segment
                    if (matrix2[y][x - p] > -1 || matrix2[y][x + p] > -1 ||
                        matrix2[y - p][x] > -1 || matrix2[y + p][x] > -1) {
                        count++;
                    }
                }
            }
        }
    return count
}

// Helper function to convert an arrow into a matrix for easier pixel proximity functions
function arrayToMatrix(arr, rowLength) {
    let newArray = [];

    // Check
    if (arr.length % rowLength > 0 || rowLength < 1) {
        console.log("array not divisible by rowLength ", arr, rowLength);
        return
    }

    let rows = arr.length / rowLength;
    for (let x = 0; x < rows; x++) {
        let b = arr.slice(x * rowLength, x * rowLength + rowLength);
        newArray.push(b);
    }
    return newArray;
}
