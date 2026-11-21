// ======================================
// GET WEBSITE ELEMENTS
// ======================================

const imageInput = document.getElementById("imageInput");

const uploadArea = document.getElementById("uploadArea");

const uploadContent = document.getElementById("uploadContent");

const previewContainer = document.getElementById("previewContainer");

const imagePreview = document.getElementById("imagePreview");

const browseButton = document.getElementById("browseButton");

const removeImageButton = document.getElementById("removeImage");

const cameraButton = document.getElementById("cameraButton");

const webcamButton = document.getElementById("webcamButton");

const analyzeButton = document.getElementById("analyzeButton");

const loadingContainer = document.getElementById("loadingContainer");

const errorMessage = document.getElementById("errorMessage");

const resultsSection = document.getElementById("resultsSection");

const diagnosisContent = document.getElementById("diagnosisContent");

const newAnalysisButton = document.getElementById("newAnalysisButton");

const webcamContainer = document.getElementById("webcamContainer");

const webcam = document.getElementById("webcam");

const captureButton = document.getElementById("captureButton");

const stopCameraButton = document.getElementById("stopCameraButton");

const captureCanvas = document.getElementById("captureCanvas");


// ======================================
// VARIABLES
// ======================================

let selectedImage = null;

let cameraStream = null;


// ======================================
// IMAGE SELECTION
// ======================================

browseButton.addEventListener("click", function () {

    imageInput.click();

});


imageInput.addEventListener("change", function (event) {

    const file = event.target.files[0];

    if (file) {
        selectImage(file);
    }

});


// ======================================
// SELECT IMAGE FUNCTION
// ======================================

function selectImage(file) {

    hideError();

    // Validate image type
    if (!file.type.startsWith("image/")) {

        showError("Please select a valid image.");

        return;
    }

    // Validate image size
    if (file.size > 10 * 1024 * 1024) {

        showError("Image size must be less than 10 MB.");

        return;
    }

    selectedImage = file;

    // Display image preview
    const imageURL = URL.createObjectURL(file);

    imagePreview.src = imageURL;

    uploadContent.hidden = true;

    previewContainer.hidden = false;

    analyzeButton.disabled = false;

    // Hide previous results
    resultsSection.hidden = true;

}


// ======================================
// REMOVE IMAGE
// ======================================

removeImageButton.addEventListener("click", function () {

    resetImage();

});


function resetImage() {

    selectedImage = null;

    imageInput.value = "";

    imagePreview.src = "";

    previewContainer.hidden = true;

    uploadContent.hidden = false;

    analyzeButton.disabled = true;

    resultsSection.hidden = true;

    loadingContainer.hidden = true;

    hideError();

}


// ======================================
// DRAG AND DROP
// ======================================

uploadArea.addEventListener("dragover", function (event) {

    event.preventDefault();

    uploadArea.classList.add("dragging");

});


uploadArea.addEventListener("dragleave", function () {

    uploadArea.classList.remove("dragging");

});


uploadArea.addEventListener("drop", function (event) {

    event.preventDefault();

    uploadArea.classList.remove("dragging");

    const file = event.dataTransfer.files[0];

    if (file) {
        selectImage(file);
    }

});


// ======================================
// PHONE CAMERA
// ======================================

cameraButton.addEventListener("click", function () {

    imageInput.setAttribute("capture", "environment");

    imageInput.click();

});


// ======================================
// LAPTOP WEBCAM
// ======================================

webcamButton.addEventListener("click", async function () {

    hideError();

    try {

        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "environment"
            },
            audio: false
        });

        webcam.srcObject = cameraStream;

        webcamContainer.hidden = false;

    } catch (error) {

        showError(
            "Unable to access camera. Please allow camera permission or use image upload."
        );

        console.error(error);

    }

});


// ======================================
// CAPTURE WEBCAM IMAGE
// ======================================

captureButton.addEventListener("click", function () {

    if (!cameraStream) {
        return;
    }

    const videoWidth = webcam.videoWidth;

    const videoHeight = webcam.videoHeight;

    captureCanvas.width = videoWidth;

    captureCanvas.height = videoHeight;

    const context = captureCanvas.getContext("2d");

    context.drawImage(
        webcam,
        0,
        0,
        videoWidth,
        videoHeight
    );

    // Convert captured image to a file
    captureCanvas.toBlob(function (blob) {

        if (!blob) {

            showError("Unable to capture image.");

            return;
        }

        const file = new File(
            [blob],
            "plant-photo.jpg",
            {
                type: "image/jpeg"
            }
        );

        selectImage(file);

        stopCamera();

    }, "image/jpeg", 0.90);

});


// ======================================
// STOP WEBCAM
// ======================================

stopCameraButton.addEventListener("click", function () {

    stopCamera();

});


function stopCamera() {

    if (cameraStream) {

        cameraStream.getTracks().forEach(function (track) {

            track.stop();

        });

        cameraStream = null;

    }

    webcam.srcObject = null;

    webcamContainer.hidden = true;

}


// ======================================
// ANALYZE IMAGE
// ======================================

analyzeButton.addEventListener("click", async function () {

    if (!selectedImage) {

        showError("Please select a plant image first.");

        return;
    }

    hideError();

    resultsSection.hidden = true;

    loadingContainer.hidden = false;

    analyzeButton.disabled = true;

    const formData = new FormData();

    formData.append("image", selectedImage);


    try {

        // Send image to Flask backend
        const response = await fetch("/analyze", {

            method: "POST",

            body: formData

        });


        const data = await response.json();


        // Check whether the request was successful
        if (!response.ok || !data.success) {

            throw new Error(
                data.error || "Analysis failed."
            );

        }


        // Display AI report
        diagnosisContent.textContent = data.diagnosis;

        resultsSection.hidden = false;

        loadingContainer.hidden = true;


        // Scroll to results
        resultsSection.scrollIntoView({

            behavior: "smooth",

            block: "start"

        });


    } catch (error) {

        loadingContainer.hidden = true;

        showError(error.message);

        console.error(error);

    } finally {

        analyzeButton.disabled = false;

    }

});


// ======================================
// ANALYZE ANOTHER PLANT
// ======================================

newAnalysisButton.addEventListener("click", function () {

    resetImage();

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

});


// ======================================
// ERROR FUNCTIONS
// ======================================

function showError(message) {

    errorMessage.textContent = message;

    errorMessage.hidden = false;

}


function hideError() {

    errorMessage.textContent = "";

    errorMessage.hidden = true;

}


// ======================================
// CLEANUP
// ======================================

window.addEventListener("beforeunload", function () {

    stopCamera();

});