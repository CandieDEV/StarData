const processIMG = document.getElementById("processIMG");
const outputDisplay = document.getElementById("outputDisplay");

// Helper function to try and automatically calculate the best temps for star isolation
function computeBackgroundParameters(meta) {
  if (!meta) {
    console.warn("No meta-data found");
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
      cutoffMultiplier -= 0.1;
    } else if (exposureSeconds < 1 / 20) {
      threshold -= 10;
      cutoffMultiplier += 0.1;
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
function thresholdMethod() {
  const w = starDisplay.width;
  const h = starDisplay.height;

  const imageData = ctxStar.getImageData(0, 0, w, h, {
    willReadFrequently: true,
  });
  const data = imageData.data;
  const threshold = 30;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b; //estimates the percieved brightness
    if (brightness < threshold) {
      data[i + 3] = 0;
    }
  }
  ctxStar.putImageData(imageData, 0, 0);
}

// Isolating the star by grabbing the brightest part of the image
function isolationMethod() {
  const w = starDisplay.width;
  const h = starDisplay.height;

  const imgData = ctxStar.getImageData(0, 0, w, h, {
    willReadFrequently: true,
  });
  const data = imgData.data;

  const bright = new Uint16Array(w * h);
  let maxBrightness = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    bright[p] = lum;
    if (lum > maxBrightness) maxBrightness = lum;
  }
  const cutoffMultiplier = 0.37;
  const cutoff = maxBrightness * cutoffMultiplier;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    if (bright[p] < cutoff) {
      data[i + 3] = 0;
    }
  }
  ctxStar.putImageData(imgData, 0, 0);
}

function srgbToLinear(c) {
  if (c <= 0.04045) {
    return c / 12.92;
  } else {
    return Math.pow((c + 0.055) / 1.055, 2.4);
  }
}

// Helper function to grab the measured flux
function measureStarFlux() {
  const imageData = ctxStar.getImageData(
    0,
    0,
    starDisplay.width,
    starDisplay.height,
    { willReadFrequently: true },
  );
  const data = imageData.data;
  let flux = 0;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue; // ignore background/removed pixels
    let r = data[i] / 255,
      g = data[i + 1] / 255,
      b = data[i + 2] / 255;
    r = srgbToLinear(r);
    g = srgbToLinear(g);
    b = srgbToLinear(b);
    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b; //Estimates a percieved brightness of the star
    flux += brightness; //Gets the sum of the percieved brightness, not a true flux as it is without unit
  }
  const exposure =
    window._imgMeta?.exposureTime !== null
      ? window._imgMeta.exposureTime[0] / window._imgMeta.exposureTime[1]
      : 30;
  flux /= exposure;
  return flux;
}

// Helper function to estimate the apparent magnitude using flux
const fluxTomagnitude = (flux) => {
  const zero_point = 15.49;
  return -2.5 * Math.log10(flux) + zero_point; //uses the correlation between flux and apparent magnitude. Multiplied by a constant to account for errors.
};

// A table of known correlations between a stars temperature and their color. This table assumes main sequence stars
const colorTable = [
  { temp: 2300, color: "#ff6813" },
  { temp: 2400, color: "#ff6e17" },
  { temp: 2500, color: "#ff731b" },
  { temp: 2600, color: "#ff7920" },
  { temp: 2700, color: "#ff7e24" },
  { temp: 2800, color: "#ff8429" },
  { temp: 2900, color: "#ff892e" },
  { temp: 3000, color: "#ff8d33" },
  { temp: 3100, color: "#ff9238" },
  { temp: 3200, color: "#ff973e" },
  { temp: 3300, color: "#ff9b43" },
  { temp: 3400, color: "#ff9f49" },
  { temp: 3500, color: "#ffa44f" },
  { temp: 3600, color: "#ffa855" },
  { temp: 3700, color: "#ffac5b" },
  { temp: 3800, color: "#ffaf61" },
  { temp: 3900, color: "#ffb367" },
  { temp: 4000, color: "#ffb76d" },
  { temp: 4100, color: "#ffba73" },
  { temp: 4200, color: "#ffbe79" },
  { temp: 4300, color: "#ffc180" },
  { temp: 4400, color: "#ffc486" },
  { temp: 4500, color: "#ffc78c" },
  { temp: 4600, color: "#ffca92" },
  { temp: 4700, color: "#ffcd98" },
  { temp: 4800, color: "#ffd09f" },
  { temp: 4900, color: "#ffd2a5" },
  { temp: 5000, color: "#ffd5ab" },
  { temp: 5100, color: "#ffd8b1" },
  { temp: 5200, color: "#ffdab7" },
  { temp: 5300, color: "#ffddbd" },
  { temp: 5400, color: "#ffdfc3" },
  { temp: 5500, color: "#ffe1c9" },
  { temp: 5600, color: "#ffe4cf" },
  { temp: 5700, color: "#ffe6d4" },
  { temp: 5800, color: "#ffe8da" },
  { temp: 5900, color: "#ffeae0" },
  { temp: 6000, color: "#ffece6" },
  { temp: 6100, color: "#ffeeeb" },
  { temp: 6200, color: "#fff0f1" },
  { temp: 6300, color: "#fff2f6" },
  { temp: 6400, color: "#fff3fc" },
  { temp: 6500, color: "#fcf3ff" },
  { temp: 6600, color: "#f7f0ff" },
  { temp: 6700, color: "#f2edff" },
  { temp: 6800, color: "#eeeaff" },
  { temp: 6900, color: "#e9e7ff" },
  { temp: 7000, color: "#e5e4ff" },
  { temp: 7200, color: "#dddfff" },
  { temp: 7400, color: "#d6daff" },
  { temp: 7600, color: "#d0d6ff" },
  { temp: 7800, color: "#cad2ff" },
  { temp: 8000, color: "#c5ceff" },
  { temp: 8200, color: "#c0cbff" },
  { temp: 8400, color: "#bbc7ff" },
  { temp: 8600, color: "#b7c4ff" },
  { temp: 8800, color: "#b3c2ff" },
  { temp: 9000, color: "#afbfff" },
  { temp: 9200, color: "#abbcff" },
  { temp: 9400, color: "#a8baff" },
  { temp: 9600, color: "#a5b8ff" },
  { temp: 9800, color: "#a2b6ff" },
  { temp: 10000, color: "#a0b4ff" },
  { temp: 10200, color: "#9db2ff" },
  { temp: 10400, color: "#9bb0ff" },
  { temp: 10600, color: "#99aeff" },
  { temp: 10800, color: "#96adff" },
  { temp: 11000, color: "#94abff" },
  { temp: 11200, color: "#93aaff" },
  { temp: 11400, color: "#91a8ff" },
  { temp: 11600, color: "#8fa7ff" },
  { temp: 11800, color: "#8da6ff" },
  { temp: 12000, color: "#8ca4ff" },
];

function colorToTemp(color, step = 0.001) {
  const target = d3.lab(color);
  if (!target) return null;

  let bestTemp = null;
  let bestDistance = Infinity;

  for (let i = 0; i < colorTable.length - 1; i++) {
    const c1 = d3.lab(colorTable[i].color);
    const c2 = d3.lab(colorTable[i + 1].color);

    const interpolate = d3.interpolateLab(c1, c2);

    for (let t = 0; t <= 1; t += step) {
      const c = d3.lab(interpolate(t));

      const distance =
        Math.pow(target.l - c.l, 2) +
        Math.pow(target.a - c.a, 2) +
        Math.pow(target.b - c.b, 2);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestTemp =
          colorTable[i].temp +
          t * (colorTable[i + 1].temp - colorTable[i].temp);
      }
    }
  }
  return bestTemp;
}

// A table of known correlations between temperature and absolute magnitude in main sequence stars according to https://www.pas.rochester.edu/~emamajek/EEM_dwarf_UBVIJHK_colors_Teff.txt
const absoluteMTableDwarf = [
  { temp: 44900, M: -5.8 },
  { temp: 42900, M: -5.5 },
  { temp: 41400, M: -5.35 },
  { temp: 40500, M: -5.2 },
  { temp: 39500, M: -5.1 },
  { temp: 38300, M: -4.95 },
  { temp: 37100, M: -4.8 },
  { temp: 36100, M: -4.65 },
  { temp: 35100, M: -4.5 },
  { temp: 34300, M: -4.35 },
  { temp: 33300, M: -4.2 },
  { temp: 31900, M: -4.05 },
  { temp: 31400, M: -3.9 },
  { temp: 29000, M: -3.5 },
  { temp: 26000, M: -3.0 },
  { temp: 24500, M: -2.6 },
  { temp: 20600, M: -1.8 },
  { temp: 18500, M: -1.5 },
  { temp: 17000, M: -1.2 },
  { temp: 16400, M: -1.0 },
  { temp: 15700, M: -0.85 },
  { temp: 14500, M: -0.55 },
  { temp: 14000, M: -0.4 },
  { temp: 12300, M: 0.0 },
  { temp: 10700, M: 0.5 },
  { temp: 10400, M: 0.6 },
  { temp: 9700, M: 0.99 },
  { temp: 9300, M: 1.16 },
  { temp: 8800, M: 1.35 },
  { temp: 8600, M: 1.7 },
  { temp: 8250, M: 1.94 },
  { temp: 8100, M: 2.01 },
  { temp: 7910, M: 2.12 },
  { temp: 7760, M: 2.23 },
  { temp: 7590, M: 2.32 },
  { temp: 7400, M: 2.43 },
  { temp: 7220, M: 2.57 },
  { temp: 7020, M: 2.76 },
  { temp: 6820, M: 2.97 },
  { temp: 6750, M: 3.08 },
  { temp: 6670, M: 3.2 },
  { temp: 6550, M: 3.37 },
  { temp: 6350, M: 3.69 },
  { temp: 6280, M: 3.8 },
  { temp: 6180, M: 4.05 },
  { temp: 6050, M: 4.25 },
  { temp: 5990, M: 4.35 },
  { temp: 5930, M: 4.48 },
  { temp: 5860, M: 4.62 },
  { temp: 5770, M: 4.8 },
  { temp: 5720, M: 4.87 },
  { temp: 5680, M: 4.93 },
  { temp: 5660, M: 4.98 },
  { temp: 5600, M: 5.1 },
  { temp: 5550, M: 5.2 },
  { temp: 5480, M: 5.3 },
  { temp: 5380, M: 5.55 },
  { temp: 5270, M: 5.78 },
  { temp: 5170, M: 5.95 },
  { temp: 5100, M: 6.07 },
  { temp: 4830, M: 6.5 },
  { temp: 4600, M: 6.98 },
  { temp: 4440, M: 7.28 },
  { temp: 4300, M: 7.64 },
  { temp: 4100, M: 8.16 },
  { temp: 3990, M: 8.43 },
  { temp: 3930, M: 8.56 },
  { temp: 3850, M: 8.8 },
  { temp: 3770, M: 9.2 },
  { temp: 3660, M: 9.64 },
  { temp: 3620, M: 9.85 },
  { temp: 3560, M: 10.21 },
  { temp: 3470, M: 10.61 },
  { temp: 3430, M: 11.15 },
  { temp: 3270, M: 12.1 },
  { temp: 3210, M: 12.61 },
  { temp: 3110, M: 13.58 },
  { temp: 3060, M: 14.15 },
  { temp: 2930, M: 15.3 },
  { temp: 2810, M: 16.32 },
  { temp: 2740, M: 17.1 },
  { temp: 2680, M: 17.7 },
  { temp: 2630, M: 18.16 },
  { temp: 2570, M: 18.6 },
  { temp: 2420, M: 19.2 },
  { temp: 2380, M: 19.4 },
  { temp: 2350, M: 19.75 },
  { temp: 2270, M: 20.0 },
  { temp: 2160, M: 20.5 },
  { temp: 2060, M: 20.9 },
  { temp: 1920, M: 21.7 },
  { temp: 1870, M: 22.3 },
];

// A table of known correlations between temperature and absolute magnitude in main sequence stars according to https://sites.uni.edu/morgans/astro/course/Notes/section2/spectraltemps.html
const absoluteMTableMain = [
  { temp: 54000, M: -10.0 },
  { temp: 45000, M: -8.8 },
  { temp: 43300, M: -8.6 },
  { temp: 40600, M: -8.2 },
  { temp: 37800, M: -7.7 },
  { temp: 29200, M: -6.0 },
  { temp: 23000, M: -4.4 },
  { temp: 21000, M: -3.8 },
  { temp: 17600, M: -2.6 },
  { temp: 15200, M: -1.6 },
  { temp: 14300, M: -1.2 },
  { temp: 13500, M: -0.84 },
  { temp: 12300, M: -0.23 },
  { temp: 11400, M: 0.29 },
  { temp: 9600, M: 1.4 },
  { temp: 9330, M: 1.6 },
  { temp: 9040, M: 1.8 },
  { temp: 8750, M: 2.1 },
  { temp: 8480, M: 2.3 },
  { temp: 8310, M: 2.4 },
  { temp: 7920, M: 2.7 },
  { temp: 7350, M: 3.2 },
  { temp: 7050, M: 3.5 },
  { temp: 6850, M: 3.7 },
  { temp: 6700, M: 3.8 },
  { temp: 6550, M: 4.0 },
  { temp: 6400, M: 4.1 },
  { temp: 6300, M: 4.2 },
  { temp: 6050, M: 4.5 },
  { temp: 5930, M: 4.6 },
  { temp: 5800, M: 4.8 },
  { temp: 5660, M: 4.9 },
  { temp: 5440, M: 5.2 },
  { temp: 5240, M: 5.4 },
  { temp: 5110, M: 5.6 },
  { temp: 4960, M: 5.8 },
  { temp: 4800, M: 6.0 },
  { temp: 4600, M: 6.3 },
  { temp: 4400, M: 6.6 },
  { temp: 4000, M: 7.3 },
  { temp: 3750, M: 7.7 },
  { temp: 3700, M: 7.8 },
  { temp: 3600, M: 7.9 },
  { temp: 3500, M: 8.1 },
  { temp: 3400, M: 8.3 },
  { temp: 3200, M: 8.7 },
  { temp: 3100, M: 8.9 },
  { temp: 2900, M: 9.4 },
  { temp: 2700, M: 9.9 },
];

function interpolateTwoTemp(table, temp) {
  for (let i = 0; i < table.length - 1; i++) {
    const t1 = table[i].temp;
    const t2 = table[i + 1].temp;

    if ((temp <= t1 && temp >= t2) || (temp >= t1 && temp <= t2)) {
      const m1 = table[i].M;
      const m2 = table[i + 1].M;
      return m1 + ((m2 - m1) * (temp - t1)) / (t2 - t1);
    }
  }
  return null;
}
function combineTempTables(tableA, tableB, step = 100) {
  const temps = [];

  const minTemp = Math.min(
    tableA[tableA.length - 1].temp,
    tableB[tableB.length - 1].temp,
  );
  const maxTemp = Math.max(tableA[0].temp, tableB[0].temp);

  for (let t = maxTemp; t >= minTemp; t -= step) {
    const mA = interpolateTwoTemp(tableA, t);
    const mB = interpolateTwoTemp(tableB, t);

    if (mA !== null && mB !== null) {
      temps.push({ temp: t, M: (mA + mB) / 2 });
    } else if (mA !== null) {
      temps.push({ temp: t, M: mA });
    } else if (mB !== null) {
      temps.push({ temp: t, M: mB });
    }
  }

  return temps;
}
const combinedAbsoluteMTable = combineTempTables(
  absoluteMTableDwarf,
  absoluteMTableMain,
  100, // 100 K resolution
);

function tempToMagnitude(temp, absoluteMTable) {
  if (temp >= absoluteMTable[0].temp) return absoluteMTable[0].M;
  if (temp <= absoluteMTable[absoluteMTable.length - 1].temp)
    return absoluteMTable[absoluteMTable.length - 1].M;

  const logT = Math.log10(temp);

  for (let i = 0; i < absoluteMTable.length - 1; i++) {
    const t1 = absoluteMTable[i];
    const t2 = absoluteMTable[i + 1];

    if (temp <= t1.temp && temp >= t2.temp) {
      const logT1 = Math.log10(t1.temp);
      const logT2 = Math.log10(t2.temp);

      const f = (logT - logT2) / (logT1 - logT2);

      return t2.M + f * (t1.M - t2.M);
    }
  }

  return null;
}

// Helper to turn rgb to hex
const rgbToHex = (r, g, b) =>
  "#" +
  [r, g, b]
    .map((x) => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    })
    .join("");

const magnitudeToDistance = (m, M) => {
  return Math.pow(10, (m - M + 5) / 5);
};

processIMG.addEventListener("click", (e) => {
  e.preventDefault();
  thresholdMethod(); // Isolates the star using two methods
  isolationMethod();

  const starInfo = ctxStar.getImageData(
    0,
    0,
    starDisplay.width,
    starDisplay.height,
    { willReadFrequently: true },
  );
  ctxStar.putImageData(starInfo, 0, 0);
  const flux = measureStarFlux();
  const colorThief = new ColorThief();
  const dominantColor = colorThief.getColor(starDisplay);

  const dominantHexColor = rgbToHex(...dominantColor);

  console.log(`Dominant color: ${dominantHexColor}`);

  const magnitude = fluxTomagnitude(flux, window._imgMeta);
  const temperature = colorToTemp(dominantHexColor);
  const infoMain = calcInfo(temperature, magnitude, combinedAbsoluteMTable);

  const data = {
    main: {
      w:
        temperature <= combinedAbsoluteMTable[0].temp &&
        temperature >=
          combinedAbsoluteMTable[combinedAbsoluteMTable.length - 1].temp,
      m: magnitude,
      M: infoMain[0],
      t: temperature,
      d: infoMain[1],
    },
  };

  Object.keys(data).forEach(function (key, index) {
    Object.keys(data[key]).forEach(function (k, index) {
      data[key][k] = Math.round((data[key][k] + Number.EPSILON) * 100) / 100;
    });
  });

  resultContainer.innerHTML = structure(data);
});

function tempToBV(temp) {
  return (
    0.92 *
      (1 / ((0.92 * temp) / 4600 + 1) + 1 / ((0.92 * temp) / 4600 + 0.62)) -
    1.7
  );
}

function calcInfo(temperature, magnitude, table) {
  const Magnitude = tempToMagnitude(temperature, table);
  const distance = magnitudeToDistance(magnitude, Magnitude);
  return [Magnitude, distance];
}

const resultContainer = document.getElementById("resultContainer");

const structure = (data) => `
<h3 id='result'>Resultat</h3>
<table>
  <thead>
    <tr>
      <th scope="col">Antagen stjärntyp</th>
      <th scope="col">Skenbar magnitud</th>
      <th scope="col">Absolut magnitud</th>
      <th scope="col">Temperatur (K)</th>
      <th scope="col">Avstånd (pc)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Dvärg</th>
      <td>${data.main.m ?? `Utanför temperatursgräns`}</td>
      <td>${data.main.M ?? `Utanför temperatursgräns`}</td>
      <td>${data.main.t ?? `Utanför temperatursgräns`}</td>
      <td>${data.main.d ?? `Utanför temperatursgräns`}</td>
    </tr>
  </tbody>
</table>`;
