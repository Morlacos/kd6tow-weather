const ENDPOINT = "https://misty-bar-21cf.kd6tow.workers.dev/";
const REFRESH_MS = 180000; // 3 minutos

const $ = (id) => document.getElementById(id);

const elements = {
  statusDot: $("statusDot"),
  statusText: $("statusText"),
  temperature: $("temperature"),
  temperatureUnit: $("temperatureUnit"),
  feelsLike: $("feelsLike"),
  unitToggle: $("unitToggle"),
  windSpeed: $("windSpeed"),
  windGust: $("windGust"),
  windDirection: $("windDirection"),
  windArrow: $("windArrow"),
  humidity: $("humidity"),
  pressure: $("pressure"),
  dewpoint: $("dewpoint"),
  rainRate: $("rainRate"),
  rainTotal: $("rainTotal"),
  uv: $("uv"),
  solar: $("solar"),
  observationTime: $("observationTime"),
  lastChecked: $("lastChecked"),
  errorBox: $("errorBox"),
};

let latestWeather = null;
let temperatureUnit = "F";

function displayValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") return "--";
  return `${value}${suffix}`;
}

function degreesToCardinal(degrees) {
  if (degrees === null || degrees === undefined || Number.isNaN(Number(degrees))) {
    return "--";
  }

  const directions = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];

  const index = Math.round(Number(degrees) / 22.5) % 16;
  return directions[index];
}

function fahrenheitToCelsius(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return (number - 32) * 5 / 9;
}

function formatTemperature(valueF) {
  const number = Number(valueF);

  if (!Number.isFinite(number)) return "--";

  if (temperatureUnit === "C") {
    return fahrenheitToCelsius(number).toFixed(1);
  }

  return number.toFixed(1);
}

function temperatureText(valueF) {
  const formatted = formatTemperature(valueF);
  if (formatted === "--") return "--";
  return `${formatted}°${temperatureUnit}`;
}

function setStationStatus(isOnline) {
  elements.statusDot.className = isOnline
    ? "status-dot online"
    : "status-dot offline";

  elements.statusText.textContent = isOnline
    ? "Station Online"
    : "Station Offline";
}

function renderTemperature() {
  if (!latestWeather) return;

  elements.temperature.textContent = formatTemperature(latestWeather.temperature);
  elements.temperatureUnit.textContent = `°${temperatureUnit}`;
  elements.feelsLike.textContent =
    `Feels like ${temperatureText(latestWeather.feelsLike)}`;
  elements.dewpoint.textContent =
    temperatureText(latestWeather.dewpoint);
}

function renderWeather(data) {
  const isOnline =
    data.success === true && data.stationStatus === "online";

  setStationStatus(isOnline);

  const weather = data.weather || {};
  latestWeather = weather;

  const windCardinal =
    weather.windCardinal || degreesToCardinal(weather.windDirection);

  renderTemperature();

  elements.windSpeed.textContent = displayValue(weather.windSpeed);
  elements.windGust.textContent = displayValue(weather.windGust);

  elements.windDirection.textContent =
    `${windCardinal} · ${displayValue(weather.windDirection, "°")}`;

  elements.windArrow.style.transform =
    `translateX(-50%) rotate(${Number(weather.windDirection || 0)}deg)`;

  elements.humidity.textContent = displayValue(weather.humidity, "%");
  elements.pressure.textContent = displayValue(weather.pressure, " inHg");
  elements.rainRate.textContent =
    displayValue(weather.precipitationRate, " in/hr");
  elements.rainTotal.textContent =
    displayValue(weather.precipitationTotal, " in");
  elements.uv.textContent = displayValue(weather.uv);
  elements.solar.textContent =
    displayValue(weather.solarRadiation, " W/m²");
  elements.observationTime.textContent =
    displayValue(data.observationTime);

  const checkedDate = data.checkedAt
    ? new Date(data.checkedAt)
    : new Date();

  elements.lastChecked.textContent =
    `Checked: ${checkedDate.toLocaleString()}`;

  if (!isOnline && (data.error || data.message)) {
    elements.errorBox.textContent = data.error || data.message;
    elements.errorBox.hidden = false;
  } else {
    elements.errorBox.hidden = true;
  }
}

async function refreshWeather() {
  try {
    const response = await fetch(
      `${ENDPOINT}?t=${Date.now()}`,
      {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Weather service returned HTTP ${response.status}`
      );
    }

    const data = await response.json();
    renderWeather(data);
  } catch (error) {
    setStationStatus(false);
    elements.errorBox.textContent =
      `Unable to load station data: ${error.message}`;
    elements.errorBox.hidden = false;
  }
}

elements.unitToggle.addEventListener("change", () => {
  temperatureUnit = elements.unitToggle.checked ? "C" : "F";
  renderTemperature();
});

refreshWeather();
setInterval(refreshWeather, REFRESH_MS);
