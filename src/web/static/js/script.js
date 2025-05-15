let chart = null;

async function getCities() {
    try {
        const response = await fetch('../../../config/map.yml');
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

    for (const city of cities) {
        try {
            // Truy cập trực tiếp file CSV mới nhất
            const response = await fetch(`../../../data/${city}/aqi_${city}_2025_may.csv`);
            const csvText = await response.text();
            const rows = csvText.split('\n').filter(row => row.trim());
            
            if (rows.length >= 2) {
                const headers = rows[0].split(',');
                cityData[city] = rows.slice(1).map(row => {
                    const data = row.split(',');
                    const rowData = {};
                    headers.forEach((header, index) => {
                        rowData[header] = data[index];
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
    const timeRange = document.getElementById('timeRange').value;
    
    const datasets = Object.entries(cityData).map(([city, data], index) => {
        const sortedData = data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        return {
            label: city.replace(/_/g, ' '),
            data: sortedData.map(row => ({
                x: new Date(row.timestamp),
                y: parseFloat(row.aqi) || 0
            })),
            borderColor: getRandomColor(),
            backgroundColor: getRandomColor(),
            fill: false,
            tension: 0.4,
            pointRadius: 3,
            borderWidth: 2
        };
    });

    // Hủy biểu đồ cũ nếu tồn tại
    if (chart) {
        chart.destroy();
    }

    // Tạo biểu đồ mới với cấu hình chi tiết hơn
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
                    text: 'Biến động chỉ số AQI theo thời gian',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: 20
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: {
                            hour: 'HH:mm dd/MM'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Thời gian',
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: true,
                        drawBorder: true
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Chỉ số AQI',
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: true,
                        drawBorder: true
                    },
                    min: 0,
                    ticks: {
                        stepSize: 50
                    }
                }
            }
        }
    });
}

function getRandomColor() {
    const colors = [
        '#1a73e8', '#34a853', '#fbbc04', '#ea4335',
        '#4285f4', '#0f9d58', '#db4437', '#f4b400'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
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
                <strong>Chất ô nhiễm</strong>
                ${cityData.pollutant}
            </div>
            <div class="info-item">
                <strong>Nồng độ</strong>
                ${cityData.concentration}
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