const url = '/next-departure'
const timeRemainigAlert = 60;


const fetchBusData = async () => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`)
        }

        return response.json()
    } catch (error) {
        console.log(`Error from server: ${error}`);        
    }
}


const formateDate = date => 
    date.toISOString().split('T')[0];
const formateTime = date => 
    date.toTimeString().split(" ")[0].slice(0,5);

const getTimeRemainingSecond = (time) => {
    const now = new Date();
    const timeDiff = time-now;
    return Math.floor(timeDiff / 1000);
}

const renderTable = (buses) => {
    const tbody = document.querySelector('#table-bus tbody');
    tbody.textContent = '';

    buses.forEach(bus => {
        const row = document.createElement('tr');
        const dateTimeToUTC = new Date(
            `${bus.nextDeparture.date}T${bus.nextDeparture.time}Z`
        );

        const remainingSecond = getTimeRemainingSecond(dateTimeToUTC);
        const textRemaining = remainingSecond > timeRemainigAlert 
            ? bus.nextDeparture.remaining
            : '<span class="text-success fw-bold">Отправляется<span>';        

        row.innerHTML = `
            <td>${bus.busNumber}</td>
            <td>${bus.startPoint} - ${bus.endPoint}</td>
            <td class='text-center'>${formateDate(dateTimeToUTC)}</td>
            <td class='text-center'>${formateTime(dateTimeToUTC)}</td>
            <td class='text-center'>${textRemaining}</td>
        `;
        tbody.append(row)
    });
}


const initWebSocket = () => {
    const ws = new WebSocket(`ws://${location.host}`);
    ws.addEventListener('open', () => {})

    ws.addEventListener('message', (e) => {
        const data = JSON.parse(e.data);
        renderTable(data);     
    })

    ws.addEventListener('error', (error) => {
       console.log(`WebSocket error: ${error}`);     
    })

    ws.addEventListener('close', () => {
       console.log(`WebSocket close connection`);     
    })
}


const updateTime = () => {
    const currentTimeElement = document.getElementById('current-time');
    const now = new Date();
    currentTimeElement.textContent = now.toTimeString().split(" ")[0];
    setTimeout(updateTime, 1000)
}


const init = async () => {
    updateTime();
    const buses = await fetchBusData();
    renderTable(buses);
    initWebSocket();
}

init()
