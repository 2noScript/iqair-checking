let chart = null;

async function getCities() {
    try {
        const response = await fetch('config/map.yml');
        const yamlText = await response.text();
        const config = jsyaml.load(yamlText);
        return config.cities.map(city => _normalize_text(city.name));
    } catch (error) {
        console.error('Lỗi khi lấy danh sách thành phố:', error);
        return ['Ha_Noi', 'Ho_Chi_Minh', 'Da_Nang', 'Hai_Phong', 'Nha_Trang'];
    }
}

function _normalize_text(text) {
    return text.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/\s+/g, "_");
}

// Sửa lại hàm loadCityData() để đơn giản hóa việc đọc file
async function loadCityData() {
    const citiesGrid = document.getElementById('citiesGrid');
    citiesGrid.innerHTML = '';
    
    const cities = await getCities();
    const cityData = {};
    
    const selectedYear = document.getElementById('yearSelect').value;
    const selectedMonth = document.getElementById('monthSelect').value;

    for (const city of cities) {
        try {
            const response = await fetch(`data/${city}/aqi_${city}_${selectedYear}_${selectedMonth}.csv`);
            const csvText = await response.text();
            const rows = csvText.split('\n').filter(row => row.trim());
            
            if (rows.length >= 2) {
                const headers = rows[0].split(',');
                cityData[city] = rows.slice(1).map(row => {
                    const data = row.split(',');
                    console.log(data);
                    const rowData = {};
                    headers.forEach((header, index) => {
                        rowData[header.replace(/\r/g, '')] = data[index].replace(/\r/g, '');
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
        console.error('Không thể tải dữ liệu từ bất kỳ thành phố nào');
    }
}

// Thêm event listener cho các select box
document.addEventListener('DOMContentLoaded', function() {
    const yearSelect = document.getElementById('yearSelect');
    const monthSelect = document.getElementById('monthSelect');
    
    // Set giá trị mặc định cho các select box
    const now = new Date();
    yearSelect.value = now.getFullYear().toString();
    monthSelect.value = now.toLocaleString('en', { month: 'short' }).toLowerCase();
    
    // Thêm event listener
    yearSelect.addEventListener('change', loadCityData);
    monthSelect.addEventListener('change', loadCityData);
    
    // Load dữ liệu ban đầu
    loadCityData();
});

function updateStatistics(cityData) {
    const allCities = Object.keys(cityData);
    let totalAQI = 0;
    let count = 0;
    let bestCity = { name: '', aqi: Infinity };
    let worstCity = { name: '', aqi: -1 };

    allCities.forEach(city => {
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

    document.getElementById('avgAQI').textContent = Math.round(totalAQI / count);
    document.getElementById('bestCity').textContent = `${bestCity.name.replace(/_/g, ' ')} (${Math.round(bestCity.aqi)})`;
    document.getElementById('worstCity').textContent = `${worstCity.name.replace(/_/g, ' ')} (${Math.round(worstCity.aqi)})`;
}

function createChart(cityData) {
    const ctx = document.getElementById('aqiChart').getContext('2d');
    const selectedYear = document.getElementById('yearSelect').value;
    const selectedMonth = document.getElementById('monthSelect').value;
    const getColor = getChartColors();
    
    const datasets = Object.entries(cityData).map(([city, data], index) => {
        const color = getColor(index);
        return {
            label: city.replace(/_/g, ' '),
            data: data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                     .map(row => ({
                         x: new Date(row.timestamp),
                         y: parseFloat(row.aqi) || 0
                     })),
            borderColor: color,
            backgroundColor: color,
            fill: false,
            tension: 0.3,
            pointRadius: 2,
            borderWidth: 2.5,
            pointHoverRadius: 5,
            pointHoverBorderWidth: 2
        };
    });

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                title: {
                    display: true,
                    text: `Biến động chỉ số AQI - Tháng ${selectedMonth.toUpperCase()} ${selectedYear}`,
                    font: {
                        size: 18,
                        weight: 'bold',
                        family: "'Google Sans', sans-serif"
                    },
                    padding: {
                        top: 20,
                        bottom: 20
                    },
                    color: '#202124'
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            family: "'Google Sans', sans-serif",
                            size: 12
                        },
                        boxWidth: 10,
                        boxHeight: 10
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#202124',
                    bodyColor: '#202124',
                    borderColor: '#ddd',
                    borderWidth: 1,
                    padding: 12,
                    bodyFont: {
                        family: "'Google Sans', sans-serif"
                    },
                    titleFont: {
                        family: "'Google Sans', sans-serif",
                        weight: 'bold'
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'dd/MM',
                            hour: 'HH:mm dd/MM'
                        },
                        tooltipFormat: 'dd/MM/yyyy HH:mm'
                    },
                    grid: {
                        display: true,
                        color: '#f1f3f4',
                        drawBorder: true,
                        drawTicks: true
                    },
                    ticks: {
                        font: {
                            family: "'Google Sans', sans-serif",
                            size: 11
                        },
                        color: '#5f6368'
                    },
                    title: {
                        display: true,
                        text: 'Thời gian',
                        font: {
                            family: "'Google Sans', sans-serif",
                            weight: 'bold',
                            size: 13
                        },
                        color: '#202124'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Chỉ số AQI',
                        font: {
                            family: "'Google Sans', sans-serif",
                            weight: 'bold',
                            size: 13
                        },
                        color: '#202124'
                    },
                    grid: {
                        display: true,
                        color: '#f1f3f4',
                        drawBorder: true
                    },
                    ticks: {
                        font: {
                            family: "'Google Sans', sans-serif",
                            size: 11
                        },
                        color: '#5f6368',
                        stepSize: 50
                    },
                    min: 0
                }
            }
        }
    });
}

function getChartColors() {
    const colors = [
        '#1a73e8', // Xanh dương Google
        '#34a853', // Xanh lá Google
        '#fbbc04', // Vàng Google
        '#ea4335', // Đỏ Google
        '#9334a8', // Tím
        '#0f9d58', // Xanh lá đậm
        '#4285f4', // Xanh dương nhạt
        '#db4437', // Đỏ cam
        '#673ab7', // Tím đậm
        '#ff6d00', // Cam
        '#0097a7', // Xanh ngọc
        '#f50057'  // Hồng
    ];
    
    return function(index) {
        return colors[index % colors.length];
    };
}

function getAQIClass(aqi) {
    const aqiNum = parseInt(aqi);
    if (aqiNum <= 50) return 'good';
    if (aqiNum <= 100) return 'moderate';
    if (aqiNum <= 150) return 'unhealthy';
    return 'very-unhealthy';
}

function createCityCard(cityData) {
    const div = document.createElement('div');
    div.className = 'city-card';
    
    const timestamp = new Date(cityData.timestamp);
    const formattedTime = timestamp.toLocaleString('vi-VN');
    
    div.innerHTML = `
        <div class="city-name">${cityData.city.replace(/_/g, ' ')}</div>
        <div class="aqi-value ${getAQIClass(cityData.aqi)}">
            ${Math.round(cityData.aqi)}
        </div>
        <div class="aqi-info">
            <div class="info-item">
                <strong>Gió</strong>
                ${cityData.wind_speed} km/h
            </div>
            <div class="info-item">
                <strong>Độ ẩm</strong>
                ${cityData.humidity}%
            </div>
            <div class="info-item">
                <strong>ô nhiễm Chính</strong>
                ${cityData.pollutant}
            </div>
            <div class="info-item">
                <strong>Nồng độ</strong>
                ${cityData.concentration}
                µg/m³
            </div>
        </div>
        <div style="text-align: right; font-size: 0.8em; margin-top: 15px; color: #666;">
            Cập nhật: ${formattedTime}
        </div>
    `;
    
    return div;
}

document.getElementById('timeRange').addEventListener('change', () => {
    loadCityData();
});

document.addEventListener('DOMContentLoaded', loadCityData);