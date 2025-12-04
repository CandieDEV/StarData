const processIMG = document.getElementById('processIMG');
const outputDisplay = document.getElementById('outputDisplay');

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

  const imageData = ctxStar.getImageData(0, 0, w, h, {willReadFrequently:true});
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

    const imgData = ctxStar.getImageData(0, 0, w, h, {willReadFrequently:true});
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


// Helper function to grab the measured flux
function measureStarFlux() {
    const imageData = ctxStar.getImageData(0, 0, starDisplay.width, starDisplay.height, {willReadFrequently:true});
    const data = imageData.data;
    console.log(data)
    let flux = 0;
    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha === 0) continue; // ignore background/removed pixels
        const r = data[i], g = data[i+1], b = data[i+2];
        const brightness = 0.299*r + 0.587*g + 0.114*b;
        flux += brightness;
    }
    return flux;
}

// Helper function to estimate the apparent magnitude using flux and metadata
function fluxToMagnitude(flux, meta) {
    // let exposureSeconds = (() => {
    // if (!meta || !meta.exposureTime) return 1; // default 1s
    //   const [num, den] = meta.exposureTime;
    //   return Number(num) / Number(den);
    // })();
    // const gain = meta.iso ? meta.iso / 100 : 1; 
    // const telescopeDiameter = 0.1;
    // const telescopeArea = Math.PI * (telescopeDiameter/2)**2;
    // const QuantomEfficiency = 0.6; 
    // const Flux0 = 3.63e-20;
    // const Ne = flux * gain;
    // const NePerSec = Ne / exposureSeconds;
    // const Nphotons = NePerSec / QuantomEfficiency;
    // const fluxPerUnitArea = Nphotons / telescopeArea;

    // const m = -2.5 * Math.log10(fluxPerUnitArea / Flux0);

    return -2.5*Math.log10(flux);
}

// Isolates the star using two methods
processIMG.addEventListener('click', (e) => {
  e.preventDefault();
  thresholdMethod();
  isolationMethod();

  const starInfo = ctxStar.getImageData(0, 0, starDisplay.width, starDisplay.height, {willReadFrequently:true});
//   const starData = starInfo.data;
//   const starDataAlphaRemoved = alphaRemoved
  ctxStar.putImageData(starInfo, 0, 0)
  //grabs the dominant color of the star
  const flux = measureStarFlux();
  const colorThief = new ColorThief();
  const dominantColor = colorThief.getColor(starDisplay);
  console.log('Dominant color:' + dominantColor);

  const magnitude = fluxToMagnitude(flux, window._imgMeta);

  console.log(flux, magnitude * -0.07714520803)
});