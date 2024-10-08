import express from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
import { DateTime, Duration } from 'luxon';
import {WebSocketServer} from 'ws';



const __fileName = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__fileName)
const fileName = path.join(__dirname, 'db/buses.json');
const timeZone = "UTC";


const port = 3000;
const app = express();
app.use(express.static(path.join(__dirname, 'public')));

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
        .set({hours, minutes, second: 0, millisecond: 0})
        .setZone(timeZone);
    
    if (now > departure) {
        departure = departure.plus({minutes: frequencyMinutes});
    }

    const endOfDay = DateTime
        .now()
        .set({hour: 23, minute: 59, second: 59, millisecond: 0})
        .setZone(timeZone);

    if (departure > endOfDay) {
        departure = departure
            .startOf('day')
            .plus({days: 1})
            .set({hours, minutes, second: 0, millisecond: 0});
    }

    while (now > departure) {
        departure = departure.plus({minutes: frequencyMinutes});
        if (departure > endOfDay) {
            departure = departure
                .startOf('day')
                .plus({days: 1})
                .set({hours, minutes, second: 0, millisecond: 0});
        }
    }

    return departure;
};


const createDateFormat = (date, time) => 
    DateTime.fromFormat(`${date} ${time}`, 'yyyy-MM-dd HH:mm:ss');

// sendUpdateData
const sendUpdateTime = async () => {
    const buses = await loadBuss();
    const now = DateTime.now().setZone(timeZone);
    const updateBuses = buses
        .map(bus => {
            const nextTimeDeparture = calcNextTime(bus.firstDepartureTime,bus.frequencyMinutes);
            const timeRemainig = Duration
                .fromMillis(
                    nextTimeDeparture.diff(now).toMillis()
                );        
            return {
                ...bus,
                nextDeparture: {
                    date: nextTimeDeparture.toFormat('yyyy-MM-dd'),
                    time: nextTimeDeparture.toFormat('HH:mm:ss'),
                    remaining: timeRemainig.toFormat('hh:mm:ss')
                }
            };
        })
        .sort((val1, val2) => 
            createDateFormat(val1.nextDeparture.date, val1.nextDeparture.time)
            - createDateFormat(val2.nextDeparture.date, val2.nextDeparture.time)
        );

    return updateBuses;
}


app.get('/next-departure', async (req, res) => {
    try {
        const updateBuses = await sendUpdateTime();
        res.json(updateBuses);
    } catch (error) {
        res.send(error)
    }    
})


const wss = new WebSocketServer({noServer: true});
const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);

    const sendUpdate = async () => {
        try {
            const newData = await sendUpdateTime();
            ws.send(JSON.stringify(newData));
        } catch (error) {
            console.log(`error send data from db => ${error}`);            
        }
    }

   const intervalId = setInterval(sendUpdate, 1000);

    ws.on('close', () => {
        clearInterval(intervalId);
        clients.delete(ws);
    }) 
})


const server = app.listen(port, () => {
    console.log(`server runner on http://localhost:` + port);
})


server.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
    })
})