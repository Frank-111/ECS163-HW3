// Load the csv file
d3.csv("data/mxmh_survey_results.csv").then(function(data) {
    // Clean the data
    data = data.filter(d =>
        d["Fav genre"] &&
        d["Music effects"] &&
        d["Anxiety"] !== "" &&
        d["Hours per day"] !== ""
    );
    
    // Convert from strings to numbers
    data.forEach(d => {
        d["Anxiety"] = +d["Anxiety"];
        d["Hours per day"] = +d["Hours per day"];
    });

    // Call the functions to create the charts
    createBarChart(data)
    createScatterPlot(data)
    createSankeyDiagram(data)
});

function createBarChart(data) {
    // Average depression score per genre
    const genreDepression = d3.rollup(
        data,
        v => d3.mean(v, d => d["Depression"]),
        d => d["Fav genre"]
    );

    const genreData = Array.from(genreDepression, ([genre, avgDepression]) => ({
        genre, 
        avgDepression
    }));
    
    // Set chart dimensions
    const width = 450;
    const height = 280;
    const margin = {top: 35, right: 15, bottom: 75, left: 45 };

    const svg = d3.select("#bar-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "black");

    // Scales
    const x = d3.scaleBand()
        .domain(genreData.map(d => d.genre))
        .range([margin.left, width - margin.right])
        .padding(0.2);
    
        const y = d3.scaleLinear()
        .domain([0, d3.max(genreData, d => d.avgDepression)])
        .nice()
        .range([height - margin.bottom, margin.top]);
    

    // Color scale to assign unique color to each genre
    const colorScale = d3.scaleOrdinal()
        .domain(genreData.map(d => d.genre))
        .range(d3.schemeTableau10);

    // Draw bars
    svg.selectAll("rect")
        .data(genreData)
        .enter()
        .append("rect")
        .attr("x", d => x(d.genre))
        .attr("y", d => y(d.avgDepression))
        .attr("width", x.bandwidth())
        .attr("height", d => y(0) - y(d.avgDepression))
        .attr("fill", d => colorScale(d.genre));

    // Draw axes
    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y).ticks(7);

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(xAxis)
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .attr("fill", "#C3B7F7");

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(yAxis)
        .selectAll("text")
        .attr("fill", "#C3B7F7");
    
    // Line color
    svg.selectAll(".domain, .tick line")
        .attr("stroke", "#C3B7F7");

    // Chart titles
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#C3B7F7")
        .style("font-size", "15px")
        .text("Average Depression Score by Favorite Genre of Music");        
}

function createScatterPlot(data) {
    // Set dimensions
    const width = 450;
    const height = 280;
    const margin = {top: 35, right: 15, bottom: 50, left: 45 };

    // Append the SVG to the scatter plot 
    const svg = d3.select("#scatter-plot")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "black");
    
        // X-axis scale
        const x = d3.scaleLinear()
            .domain([0, d3.max(data, d=>d["Hours per day"])])
            .range([margin.left, width - margin.right]);

        // Y-axis scale
        const y = d3.scaleLinear()
            .domain([0, 10])
            .range([height - margin.bottom, margin.top]);

        const colorScale = d3.scaleOrdinal()
            .domain([...new Set(data.map(d => d["Fav genre"]))])
            .range(d3.schemeTableau10);
        
        // Plot each data point as a circle
        svg.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => x(d["Hours per day"]))
            .attr("cy", d => y(d["Depression"]))
            .attr("r", 3)
            .attr("fill", d => colorScale(d["Fav genre"]));
        
        // X-axis
        const xAxis = d3.axisBottom(x).ticks(10);
        svg.append("g")
          .attr("transform", `translate(0,${height - margin.bottom})`)
          .call(xAxis)
          .selectAll("text")
          .attr("fill", "#C3B7F7");

        // Y-axis
        const yAxis = d3.axisLeft(y).ticks(10);
        svg.append("g")
          .attr("transform", `translate(${margin.left},0)`)
          .call(yAxis)
          .selectAll("text")
          .attr("fill", "#C3B7F7");
        
        // X-axis label
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height - 10) 
            .attr("text-anchor", "middle")
            .attr("fill", "#C3B7F7")
            .style("font-size", "12px")
            .text("Hours of Music Listened (per day)");

        // Y-axis label
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", 15) 
            .attr("text-anchor", "middle")
            .attr("fill", "#C3B7F7")
            .style("font-size", "12px")
            .text("Depression Score");

        // Style the axis lines and ticks
        svg.selectAll(".domain, .tick line")
            .attr("stroke", "#C3B7F7");

        // Title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", margin.top / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "#C3B7F7")
            .style("font-size", "16px")
            .text("Depression Score vs. Hours of Music Listening");
}

function createSankeyDiagram(data) {
    // Prep genre → music effect link counts
    const linkMap = d3.rollup(
      data,
      v => v.length,
      d => d["Fav genre"],
      d => d["Music effects"]
    );
  
    // Flatten into {source, target, value} format
    const links = [];
    const nodesSet = new Set();
  
    linkMap.forEach((targetMap, source) => {
      targetMap.forEach((value, target) => {
        links.push({ source, target, value });
        nodesSet.add(source);
        nodesSet.add(target);
      });
    });
  
    const nodes = Array.from(nodesSet).map(name => ({ name }));
  
    // Create index mapping for nodes
    const nodeIndex = Object.fromEntries(nodes.map((d, i) => [d.name, i]));
  
    // Convert link names to indices
    const indexedLinks = links.map(d => ({
      source: nodeIndex[d.source],
      target: nodeIndex[d.target],
      value: d.value
    }));

    const genreNames = data.map(d => d["Fav genre"]);
    const uniqueGenres = Array.from(new Set(genreNames));

    const colorScale = d3.scaleOrdinal()
        .domain(uniqueGenres)
        .range(d3.schemeSet3); 
  
    // SVG 
    const width = 1000;
    const height = 603;
  
    const svg = d3.select("#sankey-diagram")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background", "black");
  
    // Sankey generator
    const sankey = d3.sankey()
      .nodeWidth(20)
      .nodePadding(15)
      .extent([[1, 1], [width - 1, height - 6]]);
  
    const sankeyData = sankey({
      nodes: nodes.map(d => ({ ...d })),
      links: indexedLinks
    });
  
    // Links
    svg.append("g")
      .selectAll("path")
      .data(sankeyData.links)
      .join("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("fill", "none")
      .attr("stroke", d => {
        return colorScale(d.source.name);
      })
      .attr("stroke-width", d => Math.max(1, d.width))
      .attr("stroke-opacity", 0.4);
  
    // Nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(sankeyData.nodes)
      .join("g");
  
    node.append("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", "#C3B7F7")
      .attr("stroke", "#222");
  
    // Labels
    node.append("text")
      .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
      .attr("fill", "#C3B7F7")
      .style("font-size", "12px")
      .text(d => d.name);
  
    // Title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("fill", "#C3B7F7")
      .style("font-size", "24px")
      .text("Perceived Effects of Mental Health by Favorite Genre");
  }