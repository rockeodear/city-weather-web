import {Pool} from 'pg'
import dayjs from "dayjs";
import {writeFileSync} from "fs";

const tableName = 'area_weather_day'

// 优化连接池配置（添加SSL选项）
const pool = new Pool({
    host: '116.198.52.216',
    port: 8812,
    user: 'rocke',
    password: '12312037rocke',
    database: 'qdb',
    max: 20,
    idleTimeoutMillis: 30000,
});

const getDayWeather = async (date) => {
    const client = await pool.connect();
    try {
        const query = `
            SELECT *
            FROM area_weather_day
            WHERE date = '${date}' AND cityName=areaName
        `;
        const result = await client.query(query);
        return result.rows || [];
    } catch (error) {
        console.log(error);
    } finally {
        // 确保在任何情况下都释放客户端
        client.release();
    }
}

const syncWeather = async () => {
    const today = dayjs()
    for (let i = 0; i < 6; i++) {
        const day = today.add(i,'day').format('YYYY-MM-DD');
        const weatherList = await getDayWeather(day);
        // 进行格式化
        const formatWeatherList = weatherList.map(weather => {
            return {
                date: dayjs(weather.date).format('YYYY-MM-DD'),
                cn: weather.cityName,
                an: weather.areaName,
                pn: weather.province,
                dw: weather.dayWeather,
                dwd: weather.dayWindDirection,
                dwp: weather.dayWindPower,
                nw: weather.nightWeather,
                nwd: weather.nightWindDirection,
                nwp: weather.nightWindPower,
                mat: weather.maxTemp,
                mit: weather.minTemp,
                pt: dayjs(weather.publishTime).format('YYYY-MM-DD HH:mm:ss'),
            }
        })

        writeFileSync(new URL(`./${day}.json`, import.meta.url), JSON.stringify({
            type: 'weatherList',
            data: formatWeatherList,
        }, null, 2));
        console.log(`${day} 天气已更新`)
    }
}
syncWeather()

