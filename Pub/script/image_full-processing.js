const processIMG = document.getElementById('processIMG');
const outputDisplay = document.getElementById('outputDisplay');

let starData = null;

// Isolates the star using two methods
processIMG.addEventListener('click', (e) => {
  e.preventDefault();
  thresholdMethod();
  isolationMethod();

  starData = ctxStar.getImageData(0, 0, starDisplay.width, starDisplay.height);
});

// Function to try and automatically calculate the best values for star isolation
function computeBackgroundParameters(meta) {
  if (!meta) {
    console.warn('No meta-data found')
    return { threshold: 20, cutoffMultiplier: 0.23 }; 
  }

  let threshold = 20;
  let cutoffMultiplier = 0.23;

  const exp = meta.exposureTime;
  const iso = meta.iso;

  let exposureSeconds = null;
  if (typeof exp === "string" && exp.includes("/")) {
      const [num, den] = exp.split("/");
      exposureSeconds = Number(num) / Number(den);
  } else if (typeof exp === "number") {
      exposureSeconds = exp;
  }

  if (exposureSeconds !== null) {
      if (exposureSeconds >= 2) {
          threshold += 25;
          cutoffMultiplier -= 0.10;
      } else if (exposureSeconds < 1/20) {
          threshold -= 10;
          cutoffMultiplier += 0.10;
      }
  }

  if (iso) {
      if (iso > 1600) {
          threshold += 10;
          cutoffMultiplier -= 0.05;
      } else if (iso < 400) {
          threshold -= 5;
          cutoffMultiplier += 0.05;
      }
  }

  threshold = Math.max(5, Math.min(120, threshold));
  cutoffMultiplier = Math.max(0.1, Math.min(0.8, cutoffMultiplier));

  return { threshold, cutoffMultiplier };
}

// Isolating the star by checking each pixel against a threshold
function thresholdMethod(){
  const w = starDisplay.width;
  const h = starDisplay.height;

  const imageData = ctxStar.getImageData(0, 0, w, h);
  const data = imageData.data;

  const { threshold } = computeBackgroundParameters(window._imgMeta); 
  for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const brightness = (r + g + b) / 3;

      if (brightness < threshold) {
          data[i + 3] = 0; 
      }
  }
  ctxStar.putImageData(imageData, 0, 0);
}


// Isolating the star by grabbing the brightest part of the image
function isolationMethod(){
    const w = starDisplay.width;
    const h = starDisplay.height;

    const imgData = ctxStar.getImageData(0, 0, w, h);
    const data = imgData.data;

    const bright = new Uint16Array(w * h);
    let maxBrightness = 0;
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        const r = data[i], g = data[i+1], b = data[i+2];
        const lum = 0.2126*r + 0.7152*g + 0.0722*b;
        bright[p] = lum;
        if (lum > maxBrightness) maxBrightness = lum;
    }

    const { cutoffMultiplier } = computeBackgroundParameters(window._imgMeta)
    const cutoff = maxBrightness * cutoffMultiplier;  
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        if (bright[p] < cutoff) {
            data[i + 3] = 0; 
        }
    }
    ctxStar.putImageData(imgData, 0, 0);
}