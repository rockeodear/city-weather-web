import {readFileSync, writeFileSync} from 'fs';

const chinaJson = JSON.parse(readFileSync(new URL('./all_city.json', import.meta.url)));

// https://geo.datav.aliyun.com/areas_v3/bound/320200_full.json
// https://geo.datav.aliyun.com/areas_v3/bound/110000.json


const run = async () => {

    for (const feature of chinaJson.features) {
        const adCode = feature.properties['adcode']
        const name = feature.properties.name
        console.log(feature.properties.level)
        if (feature.properties.level === 'district' ) {
            writeFileSync(new URL(`./city-area/${adCode}.json`, import.meta.url), JSON.stringify({
                type: 'FeatureCollection',
                features: [feature],
            }, null, 2));
            continue
        }
        if (feature.properties.level !== 'city'){
            continue
        }
        // 尝试获取区的信息
        try {
            const response = await fetch(`https://geo.datav.aliyun.com/areas_v3/bound/${adCode}_full.json`)
            const json = await response.json();
            const {features: areaFutures} = json || {}
            writeFileSync(new URL(`./city-area/${adCode}.json`, import.meta.url), JSON.stringify({
                type: 'FeatureCollection',
                features: areaFutures,
            }, null, 2));
        } catch (e) {
            try {
                console.log(`${name}没有区的明细，使用市明细`)
                const response2 = await fetch(`https://geo.datav.aliyun.com/areas_v3/bound/${adCode}.json`)
                const json2 = await response2.json();
                const {features: areaFutures2} = json2 || {}
                writeFileSync(new URL(`./city-area/${adCode}.json`, import.meta.url), JSON.stringify({
                    type: 'FeatureCollection',
                    features: areaFutures2,
                }, null, 2));
            } catch (e) {
                console.log(`${name}没有市的明细，使用省明细`)
                writeFileSync(new URL(`./city-area/${adCode}.json`, import.meta.url), JSON.stringify({
                    type: 'FeatureCollection',
                    features: [feature],
                }, null, 2));
            }
        }
        console.log(name, adCode)
    }
}


run()

