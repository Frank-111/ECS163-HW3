const HISTOGRAM_NUM_BINS = 30
const HISTOGRAM_BAR_GAP = 2

Promise.all([
    d3.csv('data/ds_salaries.csv'),
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
    d3.csv('data/iso-codes-map.csv')
]).then(displayDashboard)

function displayDashboard([salaryData, countryMapData, isoCodeMapData]) {    
    const salaryHistogramData = salaryData.map(({ salary_in_usd }) => + salary_in_usd)
    displayHistogram(salaryHistogramData)
}

function displayHistogram(data) {
    // get the svg object and grab the width and height
    const svg = d3.select('#histogram-svg');
    const { width, height } = svg.node().getBoundingClientRect();

    // create margins
    const margin = { top: 48, right: 32, bottom: 56, left: 32 };
    const contentWidth = width - margin.left - margin.right;
    const contentHeight = height - margin.top - margin.bottom;

    const maxValue = Math.max(...data)
    const maxBinValue = Math.ceil(maxValue / HISTOGRAM_NUM_BINS) * (HISTOGRAM_NUM_BINS + 1)

    // add group
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // create x scale
    const x = d3.scaleLinear()
        .domain([0, maxBinValue])
        .range([0, contentWidth]);

    // set up histogram parameters
    const histogram = d3.histogram()
        .value(d => d)
        .domain([0, maxBinValue])
        .thresholds(x.ticks(HISTOGRAM_NUM_BINS));

    // apply data to histogram generator
    const bins = histogram(data);
    console.log(bins)

    // create y scale
    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .range([contentHeight, 0]);

    // add in title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .text('Distribution of Salaries (USD)');

    // add in x axis
    g.append('g')
        .attr('transform', `translate(0, ${contentHeight})`)
        .call(d3.axisBottom(x));

    // add in x label
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height - 12)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Salary (USD)');

    // add in y axis
    g.append('g')
        .call(d3.axisLeft(y));

    // add bars in
    g.selectAll('rect')
        .data(bins)
        .enter()
        .append('rect')
        .attr('x', d => x(d.x0) + HISTOGRAM_BAR_GAP / 2)
        .attr('y', d => y(d.length))
        .attr('width', d => x(d.x1) - x(d.x0) - HISTOGRAM_BAR_GAP)
        .attr('height', d => contentHeight - y(d.length))
        .style('fill', 'steelblue');
}