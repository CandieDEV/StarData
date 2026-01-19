const starInput = document.getElementById("starInput"); //The file upload
const starDisplay = document.getElementById("imgDisplay"); //Canvas where the IMG will be displayed 
const ctxStar = starDisplay.getContext("2d"); //ctx

const rectangleDisplay = document.getElementById("rectangleDisplay"); //Canvas for the selection rectangle
const ctxRect = rectangleDisplay.getContext("2d"); //ctx

// When an image is uploaded, allow the rectangle selector to be used
starInput.addEventListener("change", function() {
  previewImage(this);
  rectangleDisplay.style.display = 'block';
});

const image = new Image();
const lastIMG = new Image();

// Displays the uploaded image into canvas
function previewImage(input) {
  let reader;
  if (input.files && input.files[0]) {
    ctxStar.clearRect(0,0,starDisplay.width, starDisplay.height);
    reader = new FileReader();
    image.onload = function(){        
      const hRatio = starDisplay.width/image.width;
      const vRatio =  starDisplay.height/image.height;
      const ratio = Math.min(hRatio,vRatio);
      const centerShift_x = (starDisplay.width - image.width*ratio)/2;
      const centerShift_y = (starDisplay.height - image.height*ratio)/2;  
      ctxStar.drawImage(image, 0,0, image.width, image.height, centerShift_x, centerShift_y, image.width*ratio, image.height*ratio);  
    }
    reader.onload = async function(e) {
      image.src = e.target.result;
      starDisplay.style.border = "none"
      image.id = 'preview'

      const meta = await readExposureMetadata(input.files[0])
      window._imgMeta = meta;
    }
    reader.readAsDataURL(input.files[0]);
  }
  return;
}

// Helper function to grab meta-data from image for precise calculations
async function readExposureMetadata(file) {
    const arrayBuffer = await file.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer);
    console.log(tags)

    return {
        exposureTime: tags["ExposureTime"]?.value ?? null,
        iso: tags["ISOSpeedRatings"]?.value ?? null,
        aperture: tags["FNumber"]?.value ?? null,
        brightnessValue: tags["BrightnessValue"]?.value ?? null,
        shutterSpeedValue: tags["ShutterSpeedValue"]?.value ?? null
    };
}

// Storage object for rectangle data
const rect = {
  x: null,
  y: null,
  width: null,
  height: null
}

// Allows a rectangle to be drawn for selection
ctxRect.setLineDash([1, 0]);
let origin = null;
rectangleDisplay.onmousedown = e => { origin = {x: e.offsetX, y: e.offsetY};};
window.onmouseup = e => { origin = null; };
rectangleDisplay.onmousemove = e => { 
  if (!!origin) { 
    ctxRect.strokeStyle = "#ff0000";
    ctxRect.clearRect(0, 0, rectangleDisplay.width, rectangleDisplay.height);
    ctxRect.beginPath();
    rect.x = origin.x
    rect.y = origin.y
    rect.width = e.offsetX - origin.x
    rect.height = e.offsetY - origin.y
    ctxRect.rect(rect.x, rect.y, rect.width, rect.height); 
    ctxRect.stroke(); 
  } 
}

const saveState = [] //To store each saved state

function getPosOfCutIMG(starDisplay, image, rect){
  const hRatio = starDisplay.width / image.width;
  const vRatio = starDisplay.height / image.height;
  const ratio = Math.min(hRatio, vRatio);
  const centerShift_x = (starDisplay.width - image.width * ratio) / 2;
  const centerShift_y = (starDisplay.height - image.height * ratio) / 2;

  const srcX = (rect.x * 26 - centerShift_x) / ratio;
  const srcY = (rect.y * 26 - centerShift_y) / ratio;
  const srcW = rect.width * 26 / ratio;
  const srcH = rect.height * 26 / ratio;

  const aspectSrc = srcW / srcH;
  const aspectCanvas = starDisplay.width / starDisplay.height;

  let destW, destH, destX, destY;

  if (aspectSrc > aspectCanvas) {
    destW = starDisplay.width;
    destH = starDisplay.width / aspectSrc;
    destX = 0;
    destY = (starDisplay.height - destH) / 2;
  } else {
    destH = starDisplay.height;
    destW = starDisplay.height * aspectSrc;
    destY = 0;
    destX = (starDisplay.width - destW) / 2;
  }

  return {srcX, srcY, srcW, srcH, destX, destY, destW, destH}
}

// Function to cut the image down to selection
function cutImg(e){
  e.preventDefault();
  const saveStateData = starDisplay.toDataURL()
  saveState.push(saveStateData)

  if (rect.width === null || rect.height === null) return;
  ctxStar.clearRect(0, 0, starDisplay.width, starDisplay.height);

  const {srcX, srcY, srcW, srcH, destX, destY, destW, destH} = getPosOfCutIMG(starDisplay, image, rect);

  ctxStar.clearRect(0, 0, starDisplay.width, starDisplay.height);
  ctxStar.save();
  ctxStar.fillStyle = "#ffffff00"; 
  ctxStar.fillRect(0, 0, starDisplay.width, starDisplay.height);
  ctxStar.drawImage(image, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
  ctxStar.restore();
  
  const setImgData = starDisplay.toDataURL();
  image.src = setImgData;

  ctxRect.clearRect(0, 0, rectangleDisplay.width, rectangleDisplay.height);
  rect.x = rect.y = rect.width = rect.height = null;
  displayFinalInstructions();
}

const cutImgBtn = document.getElementById('cutIMG');
cutImgBtn.addEventListener("click", (e) => {cutImg(e)});

window.addEventListener('keyup', (e) => {
  const evtobj = window.e ? window.e : e;
  if (evtobj.key === 'Enter') {
    cutImg(e);
  }
});

//Function to allow an undo 
function undoAction(){
 if(typeof saveState[0] == 'undefined') return;
  const lastState = saveState.pop() 

  lastIMG.onload = async function(){
    ctxStar.clearRect(0, 0, starDisplay.width, starDisplay.height);
    ctxStar.save();
    ctxStar.drawImage(lastIMG, 0, 0, starDisplay.width, starDisplay.height);
    ctxStar.restore(); 
    image.src = lastState
  }
  lastIMG.src = lastState;

  ctxRect.clearRect(0, 0, rectangleDisplay.width, rectangleDisplay.height);
  rect.x = rect.y = rect.width = rect.height = null;
}

const undoIMGbtn = document.getElementById('undoIMG');
undoIMGbtn.addEventListener("click", (e) => { undoAction() });

window.addEventListener('keydown', (e) => {
  const evtobj = window.e ? window.e : e;
  if (evtobj.ctrlKey && evtobj.keyCode == 90) {
      undoAction();
  }
});

window.addEventListener('keydown', (e) => {
  const evtobj = window.e ? window.e : e;
  if (evtobj.ctrlKey && evtobj.keyCode == 83) {
    const dataURL = starDisplay.toDataURL("image/jpeg", 1.0);
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = 'Star';
    // document.body.appendChild(a);
    a.click();
  }
});