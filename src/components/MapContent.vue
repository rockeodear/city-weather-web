<script setup>

import {computed, onMounted, reactive, ref, unref} from "vue";
import allCity from '/src/assets//map-data/all_city.json';
import allProvince from '/src/assets/map-data/all-province.json';
import dayjs from "dayjs";
import {registerMap, use} from 'echarts/core'
import {CanvasRenderer} from 'echarts/renderers'
import {MapChart} from 'echarts/charts'
import {TooltipComponent, VisualMapComponent} from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, MapChart, VisualMapComponent, TooltipComponent])

registerMap('city', allCity)
registerMap('province', allProvince);


onMounted(async () => {
  // 先获取当前位置
  await getCurrentLocation();
  // 更新天气信息
  await updateWeatherData()

})

const centerPosition = ref([]);
const currentPosition = ref();

const today = dayjs()
const pickItem = ref(0);

const marks = reactive({})
for (let i = 0; i < 6; i++) {
  marks[i + 1] = today.add(i, 'day').format('YYYY-MM-DD');
}
const pickDate = computed(() => {
  return marks[pickItem.value]
})
// 创建城市名称到坐标的映射
const cityCoordinates = new Map();

allCity.features.forEach(feature => {
  const cityName = feature.properties.name;
  const coordinates = feature.properties.center || feature.properties.centroid;
  cityCoordinates.set(cityName, coordinates);
});

const weatherMap = new Map()
const weatherList = ref([])
const updateWeatherData = async () => {
  try {
    pageLoading.value = true;
    weatherList.value = await getWeatherList()
  } finally {
    pageLoading.value = false;
  }
}
const onDateChange = async () => {
  await updateWeatherData()
}

const onChartRendered = () => {
};


const cityNameMap = {}
const getWeatherList = async () => {
  if (weatherMap.has(pickDate.value)) {
    return weatherMap.get(pickDate.value)
  }
  const dateIns = dayjs(pickDate.value)
  const year = dateIns.format('YYYY')
  const month = dateIns.format('MM')
  const url = `https://raw.githubusercontent.com/rockeodear/city-weather-data/main/${year}/${month}/${pickDate.value}.json`
  const resp = await fetch(url)
  const weathersData = await resp.json()
  const list = weathersData.data
  list.forEach((item) => {
    const cityName = item.cn
    if (cityCoordinates.has(cityName) || cityCoordinates.has(cityName + '市')) {
      let coordinates = cityCoordinates.get(cityName)
      if (coordinates) {
        cityNameMap[cityName] = cityName
      } else {
        coordinates = cityCoordinates.get(cityName + '市')
        cityNameMap[cityName + '市'] = cityName
      }
      item.coordinates = coordinates
    }
  })
  const effectiveList = list.filter(item => item.coordinates)
      .map((item) => {
        const {
          cn: cityName,
          coordinates,
          mat: maxTemp,
          mit: minTemp,
          dw: dayWeather,
          dwd: dayWindDirection,
          dwp: dayWindPower,
          nw: nightWeather,
          nwd: nightWindDirection,
          nwp: nightWindPower
        } = item
        const dayWeatherIcon = getWeatherIcon(dayWeather)
        let weatherStr = dayWeatherIcon + dayWeather
        let weatherIcon = dayWeatherIcon
        if (dayWeather !== nightWeather) {
          const nightWeatherIcon = getWeatherIcon(nightWeather)
          weatherStr += `转${nightWeatherIcon + nightWeather}`
          weatherIcon += `~${nightWeatherIcon}`
        }

        const color = getTempColor(maxTemp)

        let windDirectionStr = dayWindDirection
        if (dayWindDirection !== nightWindDirection) {
          windDirectionStr += '-'
          windDirectionStr += nightWindDirection
        }

        let windPowerStr = dayWindPower
        if (dayWindPower !== nightWindPower) {
          windPowerStr += '-'
          windPowerStr += nightWindPower
        }
        return {
          name: cityName,
          value: [
            ...coordinates,
            maxTemp,
            weatherStr,
            `${minTemp}~${maxTemp}℃`,
            windDirectionStr,
            windPowerStr,
            weatherIcon
          ],
          itemStyle: {
            color
          }
        }
      })
  weatherMap.set(pickDate.value, effectiveList);
  return weatherMap.get(pickDate.value)
}

const legendData = reactive([
  {range: [-100, 0], color: '#1E90FF'},
  {range: [0, 10], color: '#00BFFF'},
  {range: [10, 15], color: '#7CFC00'},
  {range: [15, 20], color: '#32CD32'},
  {range: [20, 25], color: '#b1eeb1'},
  {range: [25, 30], color: '#efe1b2'},
  {range: [30, 35], color: '#f6be76'},
  {range: [35, 40], color: '#ffdb91'},
  {range: [40, 100], color: '#ff586a'}
]);
// 根据温度获取颜色
const getTempColor = (temp) => {
  for (let legendDatum of legendData) {
    if (temp > legendDatum.range[0] && temp <= legendDatum.range[1]) {
      return legendDatum.color
    }
  }
  return '#1E90FF'; // 极冷深蓝色
}

const labelFormatter = (params) => {
  const data = params.data?.value;
  if (globalHideLabel.value) {
    return data ? (data[7] || '') : '';
  }
  return data ? `${params.name}\n${data[3]} ${data[4]}` : params.name;
};

const chartOption = computed(() => {

  return {
    animation: false,
    progressive: 2000, // 增量渲染阈值
    progressiveThreshold: 5000, // 启用渐进渲染的数据量阈值
    tooltip: {
      trigger: 'item',
      formatter: params => {
        const data = params.data.value;
        if (data) {
          return `
          <div style="font-weight:bold">${params.name}</div>
          <div>${data[3]} ${data[4]}</div>
          <div>风向: ${data[5]}</div>
          <div>风力: ${data[6]}</div>
        `;
        }
        return '暂无数据'
      }
    },
    visualMap: {
      min: -20,
      max: 60,
      text: ['低温', '高温'],
      realtime: false,
      calculable: false,
      dimension: 2,
      inRange: {
        color: legendData.map(item => item.color)
      },
      // 精确控制分段
      pieces: [
        {min: -20, max: 0, label: '<0℃'},
        {min: 0, max: 10, label: '0-10℃'},
        {min: 10, max: 15, label: '10-15℃'},
        {min: 15, max: 20, label: '15-20℃'},
        {min: 20, max: 25, label: '20-25℃'},
        {min: 25, max: 30, label: '25-30℃'},
        {min: 30, max: 35, label: '30-35℃'},
        {min: 35, max: 40, label: '35-40℃'},
        {min: 40, label: '>40℃'}
      ]
    },
    series: [
      {
        name: '中国天气',
        seriesId: '中国天气',
        type: 'map',
        map: 'city',
        zLevel: 2,
        roam: true,
        label: {
          show: true,
          formatter: labelFormatter,
          distance: 10,
          fontSize: 8
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 8
          }
        },
        zoom: unref(currentZoom.value),
        center: unref(centerPosition.value),
        data: weatherList.value,
        nameMap: cityNameMap,
        scaleLimit: {
          min: 4,
          max: 40
        }
      },
      {
        name: '省级边界',
        seriesId: '省级边界',
        type: 'map',
        map: 'province',  // 使用省级地图
        roam: false,
        zoom: currentZoom.value,
        center: centerPosition.value,
        itemStyle: {
          borderColor: '#5a13ff',  // 边界颜色
          borderWidth: 2,     // 边界宽度
          areaColor: 'transparent'  // 区域透明，只显示边界
        },
        label: {
          show: false  // 不显示省份标签
        },
        silent: true,  // 不响应鼠标事件
        zLevel: 1,     // 放在底层
        scaleLimit: {
          min: 4,
          max: 40
        }
      }
    ]
  };
})

const chartInstance = ref()


const onChartReady = () => {
}

const currentZoom = ref(24)
const globalHideLabel = ref(false)
const mapMoveOrRoomListener = (params) => {
  if (params.seriesId !== '\u0000中国天气\u00000') {
    return
  }
  const series = chartInstance.value.getOption().series.find(item => item.name = '中国天气')
  if (params.zoom) {
    currentZoom.value = series.zoom;
    // 更新标签显示状态
    const newHideLabel = currentZoom.value < 6;
    if (newHideLabel !== globalHideLabel.value) {
      globalHideLabel.value = newHideLabel;
    }
  }

  centerPosition.value = series.center;
};


// 获取当前位置
const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (position) => {
            const {latitude, longitude} = position.coords;
            currentPosition.value = [longitude, latitude];
            centerPosition.value = currentPosition.value
            resolve([longitude, latitude]);
          },
          (error) => {
            console.error("获取位置失败:", error);
            reject(error);
            // 默认设置为北京中心点作为回退
            currentPosition.value = [116.404, 39.915];
            centerPosition.value = currentPosition.value
          }
      );
    } else {
      console.error("浏览器不支持地理定位");
      // 默认设置为北京中心点作为回退
      currentPosition.value = [116.404, 39.915];
      centerPosition.value = currentPosition.value
      resolve([116.404, 39.915]);
    }
  });
};

// 天气图标映射
const weatherIcons = {
  '晴': '☀️',
  '多云': '☁️',
  '阴': '☁️',
  '小雨': '🌧️',
  '中雨': '🌧️',
  '大雨': '🌧️',
  '暴雨': '⛈️',
  '雷阵雨': '⛈️',
  '阵雨': '🌦️',
  '雾': '🌫️',
  '雪': '❄️',
  '雨夹雪': '❄️🌧️'
}

// 获取天气图标
const getWeatherIcon = (weather) => {
  return weatherIcons[weather] || '⛅';
}


const pageLoading = ref(false)


</script>

<template>
  <div v-loading="pageLoading" class="map-container-wrapper">
    <div class="tools">
      <el-slider v-model="pickItem" :step="1" show-stops :marks="marks" :max="7" :min="1" @change="onDateChange"/>
    </div>
    <v-chart ref="chartInstance" class="map-container" @finished="onChartRendered"
             :option="chartOption" :autoresize="true" @rendered="onChartRendered"
             @georoam="mapMoveOrRoomListener"
             @ready="onChartReady"/>
    <footer>
      <p>中国城市天气可视化 | 数据来源于公开气象信息</p>
    </footer>
  </div>

</template>

<style scoped>
.map-container-wrapper {
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100vw;
  padding: 8px 20px;
  height: 100vh;
  overflow: hidden;
}

.map-container {
  flex: 1;
}

.tools {
  margin-bottom: 20px;
  padding: 0 20px;
}
footer > p{
  user-select: none;
  font-size: 12px;
  text-align: center;
}
</style>