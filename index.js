import express from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
import { DateTime } from 'luxon';
import { log } from 'node:console';


const port = 3000;
const app = express();
const __fileName = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__fileName)
const fileName = path.join(__dirname, 'db/buses.json');
const timeZone = "UTC";



const loadBuss = async () => {
    const data = await readFile(fileName, 'utf-8');
    return JSON.parse(data);    
}


// getNexDeparture
const calcNextTime = (firstDepartureTime,frequencyMinutes) => {
    const now = DateTime.now().setZone("UTC");
    // const [hour, minutes] = firstDepartureTime.split(':').map(n => +n);
    const [hours, minutes] = firstDepartureTime.split(':').map(Number);
    let departure = DateTime
        .now()
        .set({hours, minutes, seconds: 0, millisecond: 0})
        .setZone(timeZone);
    
    if (now > departure) {
        departure = departure.plus({minutes: frequencyMinutes});
    }

    const endOfDay = DateTime
        .now()
        .set({hours: 23, minutes: 59, seconds: 59, millisecond: 0})
        .setZone(timeZone);

    if (departure > endOfDay) {
        departure = departure
            .startOf('day')
            .plus({days: 1})
            .set({hours, minutes, seconds: 0, millisecond: 0});
    }

    while (now > departure) {
        departure = departure.plus({minutes: frequencyMinutes});
        if (departure > endOfDay) {
            departure = departure
                .startOf('day')
                .plus({days: 1})
                .set({hours, minutes, seconds: 0, millisecond: 0});
        }
    }

    return departure;
};


const createDateFormat = (date, time) => 
    DateTime.fromFormat(`${date} ${time}`, 'yyyy-MM-dd HH:mm:ss');


// sendUpdateData
const sendUpdateTime = async () => {
    const buses = await loadBuss();
    const updateBuses = buses
        .map(bus => {
            const nextTimeDeparture = calcNextTime(bus.firstDepartureTime,bus.frequencyMinutes);        
            return {
                ...bus,
                nextDeparture: {
                    date: nextTimeDeparture.toFormat('yyyy-MM-dd'),
                    time: nextTimeDeparture.toFormat('HH:mm:ss'),
                }
            };
        })
        .sort((val1, val2) => 
            createDateFormat(val1.nextDeparture.date, val1.nextDeparture.time)
            - createDateFormat(val2.nextDeparture.date, val2.nextDeparture.time)
        );

    return updateBuses;
}


app.listen(port, () => {
    console.log(`server runner on http::/localhost:` + port);
})


app.get('/next-departure', async (req, res) => {
    try {
        const updateBuses = await sendUpdateTime();
        res.json(updateBuses);
    } catch (error) {
        res.send(error)
    }    
})
