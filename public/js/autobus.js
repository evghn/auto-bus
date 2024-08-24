const url = '/next-departure'


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

const renderTable = (buses) => {
    const tbody = document.querySelector('#table-bus tbody');
    tbody.textContent = '';

    buses.forEach(bus => {
        const row = document.createElement('tr');
    const dateTimeToUTC = new Date(
        `${bus.nextDeparture.date}T${bus.nextDeparture.time}Z`
    ); 

        row.innerHTML = `
            <td>${bus.busNumber}</td>
            <td>${bus.startPoint} - ${bus.endPoint}</td>
            <td>${formateDate(dateTimeToUTC)}</td>
            <td>${formateTime(dateTimeToUTC)}</td>            
        `;
        tbody.append(row)

    });
}

const init = async () => {
    const buses = await fetchBusData();
    renderTable(buses)
}

init()