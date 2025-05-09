const displayData = (rawData) => {
    console.log(JSON.stringify(rawData[0]))
}

d3.csv('data/ds_salaries.csv').then(displayData)