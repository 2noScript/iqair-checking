// https://www.iqair.com/vi/vietnam/tinh-lai-chau/lai-chau
let chart = null;

async function getCities() {
  try {
    const response = await fetch("config/map.yml");
    const yamlText = await response.text();
    const config = jsyaml.load(yamlText);
    return config.cities.map((city) => _normalize_text(city.name));
  } catch (error) {
    console.error("Lỗi khi lấy danh sách thành phố:", error);
    return [];
  }
}

function _normalize_text(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/\s+/g, "_");
}


function showLoading() {
  document.getElementById("loading").classList.add("active");
}

function hideLoading() {
  document.getElementById("loading").classList.remove("active");
}

async function loadCityData() {
  showLoading();
  try {
    const citiesGrid = document.getElementById("citiesGrid");
    citiesGrid.innerHTML = "";

    const cities = await getCities();
    const cityData = {};

    const selectedYear = document.getElementById("yearSelect").value;
    const selectedMonth = document.getElementById("monthSelect").value;

    for (const city of cities) {
      try {
        const response = await fetch(
          `data/${city}/aqi_${city}_${selectedYear}_${selectedMonth}.csv`
        );
        const csvText = await response.text();
        const rows = csvText.split("\n").filter((row) => row.trim());

        if (rows.length >= 2) {
          const headers = rows[0].split(",");
          cityData[city] = rows.slice(1).map((row) => {
            const data = row.split(",");
            const rowData = {};
            headers.forEach((header, index) => {
              rowData[header.replace(/\r/g, "")] = data[index].replace(
                /\r/g,
                ""
              );
            });
            return rowData;
          });

          const latestData = cityData[city][cityData[city].length - 1];
          const card = createCityCard(latestData);
          citiesGrid.appendChild(card);
        }
      } catch (error) {
        console.error(`Lỗi khi tải dữ liệu cho ${city}:`, error);
      }
    }

    if (Object.keys(cityData).length > 0) {
      updateStatistics(cityData);
      createChart(cityData);
    } else {
      console.error("Không thể tải dữ liệu từ bất kỳ thành phố nào");
    }
  } catch (error) {
    console.error("Lỗi khi tải dữ liệu:", error);
  } finally {
    hideLoading();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const yearSelect = document.getElementById("yearSelect");
  const monthSelect = document.getElementById("monthSelect");

  const now = new Date();
  yearSelect.value = now.getFullYear().toString();
  monthSelect.value = now
    .toLocaleString("en", { month: "short" })
    .toLowerCase();

  yearSelect.addEventListener("change", loadCityData);
  monthSelect.addEventListener("change", loadCityData);

  loadCityData();
});

function updateStatistics(cityData) {
  const allCities = Object.keys(cityData);
  let totalAQI = 0;
  let count = 0;
  let bestCity = { name: "", aqi: Infinity };
  let worstCity = { name: "", aqi: -1 };

  allCities.forEach((city) => {
    const latestData = cityData[city][cityData[city].length - 1];
    const aqi = parseFloat(latestData.aqi);

    totalAQI += aqi;
    count++;

    if (aqi < bestCity.aqi) {
      bestCity = { name: city, aqi: aqi };
    }
    if (aqi > worstCity.aqi) {
      worstCity = { name: city, aqi: aqi };
    }
  });

  document.getElementById("avgAQI").textContent = Math.round(totalAQI / count);
  document.getElementById("bestCity").textContent = `${bestCity.name.replace(
    /_/g,
    " "
  )} (${Math.round(bestCity.aqi)})`;
  document.getElementById("worstCity").textContent = `${worstCity.name.replace(
    /_/g,
    " "
  )} (${Math.round(worstCity.aqi)})`;
}

function createChart(cityData) {
  const ctx = document.getElementById("aqiChart").getContext("2d");
  const selectedYear = document.getElementById("yearSelect").value;
  const getColor = getChartColors();

  const datasets = Object.entries(cityData).map(([city, data], index) => {
    const color = getColor(index);
    return {
      label: city.replace(/_/g, " "),
      data: data
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map((row) => ({
          x: new Date(row.timestamp),
          y: parseFloat(row.aqi) || 0,
        })),
      borderColor: color,
      backgroundColor: color,
      fill: false,
      tension: 0.3,
      pointRadius: 2,
      borderWidth: 2.5,
      pointHoverRadius: 5,
      pointHoverBorderWidth: 2,
    };
  });

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        title: {
          display: true,
          text: `Biến động AQI - ${selectedYear}`,
          font: {
            size: 18,
            weight: "bold",
            family: "'Google Sans', sans-serif",
          },
          padding: {
            top: 0,
            bottom: 10,
          },
          color: "#202124",
        },
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              family: "'Google Sans', sans-serif",
              size: 12,
            },
            boxWidth: 10,
            boxHeight: 10,
          },
        },
        tooltip: {
          enabled: true,
          mode: "index",
          intersect: false,
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          titleColor: "#202124",
          bodyColor: "#202124",
          borderColor: "#ddd",
          borderWidth: 1,
          padding: 12,
          bodyFont: {
            family: "'Google Sans', sans-serif",
          },
          titleFont: {
            family: "'Google Sans', sans-serif",
            weight: "bold",
          },
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "hour",
            stepSize: 6,
            displayFormats: {
              hour: "HH:mm",
              day: "dd/MM",
            },
            tooltipFormat: "dd/MM/yyyy HH:mm",
          },
          grid: {
            display: true,
            color: "#f1f3f4",
            drawBorder: true,
            drawTicks: true,
          },
          ticks: {
            source: "auto",
            maxRotation: 0,
            autoSkip: false,
            padding: 10,
            major: {
              enabled: true,
              stepSize: 6,
            },
            font: {
              family: "'Google Sans', sans-serif",
              size: 11,
            },
            color: function (context) {
              const date = new Date(context.value);
              return date.getHours() === 0 ? "#202124" : "#5f6368";
            },
            font: function (context) {
              const date = new Date(context.value);
              return {
                family: "'Google Sans', sans-serif",
                size: date.getHours() === 0 ? 12 : 11,
                weight: date.getHours() === 0 ? "bold" : "normal",
              };
            },
            callback: function (value, index, values) {
              const date = new Date(value);
              const hours = date.getHours();

              if (hours === 0) {
                return date.toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                });
              }

              if (hours % 6 === 0) {
                return date.toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
              }

              return "";
            },
          },
        },
        y: {
          title: {
            display: true,
            text: "Chỉ số AQI",
            font: {
              family: "'Google Sans', sans-serif",
              weight: "bold",
              size: 13,
            },
            color: "#202124",
          },
          grid: {
            display: true,
            color: "#f1f3f4",
            drawBorder: true,
          },
          ticks: {
            font: {
              family: "'Google Sans', sans-serif",
              size: 11,
            },
            color: "#5f6368",
            stepSize: 25,
            callback: function (value) {
              return value;
            },
          },
          min: 0,
          suggestedMax: 200,
        },
      },
      layout: {
        padding: {
          left: 15,
          right: 35,
          top: 25,
          bottom: 15,
        },
      },
      aspectRatio: 1, 
    },
  });
}

function getChartColors() {
  const colors = [
    // Màu chính của Google
    "#1a73e8", // Xanh dương Google
    "#ea4335", // Đỏ Google
    "#34a853", // Xanh lá Google
    "#fbbc04", // Vàng Google

    // Màu Material Design cơ bản
    "#9c27b0", // Tím
    "#ff6d00", // Cam
    "#00bcd4", // Xanh ngọc
    "#e91e63", // Hồng
    "#3f51b5", // Indigo
    "#009688", // Teal

    // Màu Material Design phụ
    "#673ab7", // Deep Purple
    "#2196f3", // Blue
    "#4caf50", // Green
    "#ffeb3b", // Yellow
    "#ff5722", // Deep Orange
    "#795548", // Brown
    "#607d8b", // Blue Grey
    "#f44336", // Red
    "#03a9f4", // Light Blue
    "#8bc34a", // Light Green

    // Màu Material Design mở rộng
    "#9575cd", // Deep Purple 300
    "#7986cb", // Indigo 300
    "#64b5f6", // Blue 300
    "#4fc3f7", // Light Blue 300
    "#4dd0e1", // Cyan 300
    "#4db6ac", // Teal 300
    "#81c784", // Green 300
    "#aed581", // Light Green 300
    "#dce775", // Lime 300
    "#fff176", // Yellow 300
    "#ffb74d", // Orange 300
    "#ff8a65", // Deep Orange 300
    "#a1887f", // Brown 300
    "#90a4ae", // Blue Grey 300
    "#f06292", // Pink 300
    "#ba68c8", // Purple 300

    // Màu tối
    "#1565c0", // Blue 800
    "#2e7d32", // Green 800
    "#c62828", // Red 800
    "#6a1b9a", // Purple 800
    "#4527a0", // Deep Purple 800
    "#283593", // Indigo 800
    "#00838f", // Cyan 800
    "#00695c", // Teal 800
    "#558b2f", // Light Green 800
    "#f9a825", // Yellow 800
    "#ef6c00", // Orange 800
    "#d84315", // Deep Orange 800
    "#4e342e", // Brown 800
    "#37474f", // Blue Grey 800
  ];

  return function (index) {
    return colors[index % colors.length];
  };
}

function getAQIClass(aqi) {
  const aqiValue = parseFloat(aqi);
  if (aqiValue <= 50) return "good";
  if (aqiValue <= 100) return "moderate";
  if (aqiValue <= 150) return "unhealthy";
  return "very-unhealthy";
}

function createCityCard(cityData) {
  const div = document.createElement("div");
  div.className = `city-card ${getAQIClass(cityData.aqi)}`;

  const timestamp = new Date(cityData.timestamp);
  const formattedTime = timestamp.toLocaleString("vi-VN");

  div.innerHTML = `
    <div class="city-card-header">
        <div class="header-left">
            <div class="aqi-value ${getAQIClass(cityData.aqi)}">${Math.round(
    cityData.aqi
  )}</div>
            <div class="city-name">${cityData.city.replace(/_/g, " ")}</div>
        </div>
    </div>
    
<div class="city-card-content">
  <div class="info-item pollutant">
    <i class="fas fa-head-side-mask"></i>
    <span>${cityData.pollutant}</span>
  </div>
  <div class="info-item wind">
    <i class="fas fa-wind"></i>
    <span>${cityData.wind_speed} km/h</span>
  </div>
  <div class="info-item humidity">
    <i class="fas fa-tint"></i>
    <span>${cityData.humidity}%</span>
  </div>
  <div class="info-item concentration">
    <i class="fas fa-flask"></i>
    <span>${cityData.concentration} µg/m³</span>
  </div>
</div>


    <div class="update-time">
        Cập nhật: ${formattedTime}
    </div>
  `;

  return div;
}

document.getElementById("timeRange").addEventListener("change", () => {
  loadCityData();
});

document.addEventListener("DOMContentLoaded", loadCityData);
