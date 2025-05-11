const HISTOGRAM_NUM_BINS = 30
const HISTOGRAM_BAR_GAP = 2

Promise.all([
    d3.csv('data/ds_salaries.csv'),
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
    d3.csv('data/iso-codes-map.csv')
]).then(displayDashboard)

/**
 * Renders a full salary dashboard including:
 * - A histogram of salary distribution
 * - A Sankey diagram showing relationships between salary bins, experience levels, and work types
 * - A world map color-coded by median salary per country
 *
 * @param {Array} data - An array containing:
 *   [0] {Object[]} salaryData - Array of salary records with fields such as `salary_in_usd`, `experience_level`, `remote_ratio`, and `company_location`
 *   [1] {Object} countryData - TopoJSON object representing countries of the world
 *   [2] {Object[]} isoCodeMapData - Mapping from country ISO Alpha-2 codes to internal country IDs (fields: `country_code_alpha2`, `country_id`)
 */
function displayDashboard([salaryData, countryData, isoCodeMapData]) {    
    const salaryHistogramData = salaryData.map(({ salary_in_usd }) => +salary_in_usd)

    const binSalaries = (salary) => {
        if (salary < 50000) return '< 50k'
        if (salary >= 50000 && salary < 100000) return '50k-100k'
        if (salary >= 100000 && salary < 150000) return '100k-150k'
        if (salary >= 150000 && salary < 200000) return '150k-200k'
        return '200k+'
    }

    const experienceLevelMap = {
        SE: 'Senior',
        MI: 'Mid Level',
        EN: 'Entry Level',
        EX: 'Executive'
    }

    const binWorkTypes = (remoteRatio) => {
        if (remoteRatio <= 33) return 'in-office'
        if (remoteRatio > 33 && remoteRatio <= 66) return 'hybrid'
        return 'remote'
    }

    const parallelData = salaryData.map(({ salary_in_usd, experience_level, remote_ratio }) => ({
        salaryBin: binSalaries(+salary_in_usd),
        experienceLevel: experienceLevelMap[experience_level],
        workType: binWorkTypes(+remote_ratio)
    }))

    const isoCodeMap = Object.fromEntries(isoCodeMapData.map(({country_code_alpha2, country_id}) => [country_code_alpha2, country_id]))

    const mapData = salaryData.map(({ salary_in_usd, company_location }) => ({
        salary_in_usd: +salary_in_usd,
        country: isoCodeMap[company_location]
    }))

    displayHistogram(salaryHistogramData)
    displaySankey(parallelData)
    displayMap({ mapData, countryData })
}

/**
 * Renders a histogram of salary data.
 * 
 * @param {number[]} data - An array of salary values in USD.
 * 
 * This function:
 *   - Sets up the SVG canvas and margins.
 *   - Computes histogram bins using d3.histogram with predefined number of bins.
 *   - Calculates appropriate x and y scales.
 *   - Appends axes, labels, and bars representing the frequency of salary ranges.
 */
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

/**
 * Renders a Sankey diagram based on data containing salary bins, experience levels, and work types.
 * Each row in `data` represents a flow from salary bin → experience level → work type.
 * 
 * @param {Array<Object>} data - The dataset to visualize. Each object should contain:
 *   - {string} salaryBin - The salary category of the entry.
 *   - {string} experienceLevel - The experience level
 *   - {string} workType - The work arrangement remote, hybrid, in-office).
 * 
 * The function:
 *   - Extracts unique node labels from the three categories.
 *   - Constructs a matrix to count connections between nodes.
 *   - Converts the matrix into Sankey link format.
 *   - Uses d3-sankey to compute node and link positions.
 *   - Draws nodes and links on the SVG element with id "parallel-svg".
 */
function displaySankey(data) {
    // get the svg object and grab the width and height
    const svg = d3.select('#parallel-svg');
    const { width, height } = svg.node().getBoundingClientRect();

    // set margins
    const margin = { top: 48, right: 64, bottom: 16, left: 32 };

    // get all nodes from unique values for attributes
    const salaryBins = Array.from(new Set(data.map(({salaryBin}) => salaryBin)))
    const experienceLevel = Array.from(new Set(data.map(({experienceLevel}) => experienceLevel)))
    const workType = Array.from(new Set(data.map(({workType}) => workType)))

    const nodes = [...salaryBins, ...experienceLevel, ...workType].map((id) => ({ id }))
    const nodeMap = Object.fromEntries(nodes.map(({ id }, index) => [id, index]))

    const linkMatrix = Array.from({ length: nodes.length }, () => Array(nodes.length).fill(0))

    data.forEach(({ salaryBin, experienceLevel, workType }) => {
        linkMatrix[nodeMap[salaryBin]][nodeMap[experienceLevel]] += 1
        linkMatrix[nodeMap[experienceLevel]][nodeMap[workType]] += 1
    })

    const links = []

    for (let i = 0; i < nodes.length; i++) {
        for (let j = 0; j < nodes.length; j++) {
            if (linkMatrix[i][j] > 0) {
                links.push({
                    source: i,
                    target: j,
                    value: linkMatrix[i][j]
                })
            }
        }
    }

    // get a sankey generator
    const sankey = d3.sankey()
    .nodeWidth(20)
    .nodePadding(10)
    .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);

    // generate sankey data
    const graph = sankey({nodes, links})
    
    // draw title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Sankey Diagram: Salary → Experience → Work Type");

    // get color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // draw the links using the sankeyLink generator
    svg.append("g")
        .attr("fill", "none")
        .selectAll("path")
        .data(graph.links)
        .enter()
        .append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", d => color(d.source.id))
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("opacity", 0.6)

    // create a group for the nodes
    const node = svg.append("g")
        .selectAll("g")
        .data(graph.nodes)
        .enter().append("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`)

    // draw the nodes relative to where the group is placed
    node.append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => color(d.id))

    // add in text to label nodes
    node.append("text")
        .attr("x", d => (d.x1 - d.x0) + 6)
        .attr("y", d => (d.y1 - d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "start")
        .attr("font-size", "0.75rem")
        .text(d => d.id);
}

/**
 * Displays a map with countries color-coded by median salary.
 * 
 * @param {Object} params - The data for the map and salary information.
 * @param {Array} params.mapData - Array of salary data objects containing country codes and salaries.
 * @param {Object} params.countryData - TopoJSON object containing country shapes.
 */
function displayMap({ mapData, countryData }) {
    // get map svg container and its width and height
    const svg = d3.select('#map-svg');
    const { width, height } = svg.node().getBoundingClientRect();

    // create margins
    const margin = { top: 120, right: 0, bottom: 120, left: 0 };
    const contentWidth = width - margin.left - margin.right;
    const contentHeight = height - margin.top - margin.bottom;

    // convert TopoJSON to GeoJSON for countries
    const countries = topojson.feature(countryData, countryData.objects.countries);

    // filter out Antarctica (since it's irrelevant in this map)
    countries.features = countries.features.filter(
        d => d.id !== 'ATA' && d.properties.name !== 'Antarctica'
    );

    // define projection for the map
    const projection = d3.geoMercator()
        .fitSize([contentWidth, contentHeight], countries);

    // create a geoPath generator for country shapes
    const path = d3.geoPath().projection(projection);

    // compute median salary per country
    const countrySalaries = new Map(
        d3.nest()
            .key(d => d.country)
            .rollup(values => d3.median(values, d => d.salary_in_usd))
            .entries(mapData)
            .map(({ key, value }) => [key, value])
    );

    // define color scale based on median salary values
    const color = d3.scaleSequential()
        .domain(d3.extent(Array.from(countrySalaries.values())))
        .interpolator(d3.interpolateBlues);

    // draw countries on the map
    svg.append("g")
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
        .selectAll("path")
        .data(countries.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", d => color(countrySalaries.get(d.id)) ?? "#ccc")
        .attr("stroke", "black")
        .attr("stroke-width", 0.5);

    // title for the map
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top)
        .attr("text-anchor", "middle")
        .style("font-size", "1.5rem")
        .text("Median Salary by Country (USD)");

    // create the legend
    const legendHeight = 20;
    const legendWidth = contentWidth / 2;

    const legendScale = d3.scaleLinear()
        .domain(color.domain())
        .range([0, legendWidth]);

    // add gradient for the legend
    const defs = svg.append("defs");

    const linearGradient = defs.append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%").attr("y1", "100%")
        .attr("x2", "100%").attr("y2", "100%");

    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", color(legendScale.domain()[0]));

    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", color(legendScale.domain()[1]));

    // Add the legend rectangle with gradient fill
    svg.append("g")
        .attr("transform", `translate(${width - legendWidth - 20}, ${height - margin.bottom / 2})`)
        .append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");

    // Add the legend axis
    svg.append("g")
        .attr("transform", `translate(${width - legendWidth - 20}, ${height - margin.bottom / 2 + legendHeight})`)
        .call(d3.axisBottom(legendScale).ticks(6).tickFormat(d3.format("$.2s")));
}

