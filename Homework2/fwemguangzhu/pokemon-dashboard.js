// Load data
d3.csv("pokemon_alopez247.csv").then(function(data) {
    // Data preprocessing
    data.forEach(d => {
        d.Total = +d.Total;
        d.HP = +d.HP;
        d.Attack = +d.Attack;
        d.Defense = +d.Defense;
        d.Sp_Atk = +d.Sp_Atk;
        d.Sp_Def = +d.Sp_Def;
        d.Speed = +d.Speed;
        d.Generation = +d.Generation;
        d.isLegendary = d.isLegendary === "True";
    });

    // Set dimensions and margins
    const margin = {top: 50, right: 80, bottom: 50, left: 50};  // Increased right margin
    const width = 900 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    const radarRadius = Math.min(width, height) / 2;

    // Color scales
    const typeColors = {
        "Normal": "#A8A878", "Fire": "#F08030", "Water": "#6890F0", "Electric": "#F8D030",
        "Grass": "#78C850", "Ice": "#98D8D8", "Fighting": "#C03028", "Poison": "#A040A0",
        "Ground": "#E0C068", "Flying": "#A890F0", "Psychic": "#F85888", "Bug": "#A8B820",
        "Rock": "#B8A038", "Ghost": "#705898", "Dragon": "#7038F8", "Dark": "#705848",
        "Steel": "#B8B8D0", "Fairy": "#EE99AC"
    };
    
    const generationColors = d3.scaleOrdinal()
        .domain([1, 2, 3, 4, 5, 6])
        .range(d3.schemeTableau10);

    // 1. Radar Chart - Type Distribution
    function createRadarChart() {
        const svg = d3.select("#radar")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${width/2 + margin.left}, ${height/2 + margin.top})`);

        // Count types
        const typeCounts = {};
        data.forEach(d => {
            if (d.Type_1) typeCounts[d.Type_1] = (typeCounts[d.Type_1] || 0) + 1;
            if (d.Type_2) typeCounts[d.Type_2] = (typeCounts[d.Type_2] || 0) + 1;
        });
        
        // Filter out undefined and sort
        const types = Object.keys(typeCounts).filter(t => t).sort();
        const maxCount = d3.max(Object.values(typeCounts));
        
        // Radial scale
        const rScale = d3.scaleLinear()
            .domain([0, maxCount])
            .range([0, radarRadius]);
        
        // Draw axes
        const angleSlice = Math.PI * 2 / types.length;
        
        types.forEach((type, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            const lineLength = radarRadius * 0.95;
            
            // Axis line
            svg.append("line")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", Math.cos(angle) * lineLength)
                .attr("y2", Math.sin(angle) * lineLength)
                .attr("stroke", "#ddd")
                .attr("stroke-width", 1);
            
            // Type label
            svg.append("text")
                .attr("x", Math.cos(angle) * (lineLength + 20))
                .attr("y", Math.sin(angle) * (lineLength + 20))
                .text(type)
                .attr("fill", typeColors[type] || "#000")
                .style("font-size", "12px")
                .style("text-anchor", "middle");
            
            // Grid circles
            for (let level = 1; level <= 3; level++) {
                const levelFactor = radarRadius * level / 3;
                svg.append("circle")
                    .attr("cx", 0)
                    .attr("cy", 0)
                    .attr("r", levelFactor)
                    .attr("fill", "none")
                    .attr("stroke", "#ddd")
                    .attr("stroke-width", "0.5");
            }
        });
        
        // Draw data
        const radarLine = d3.lineRadial()
            .angle((d, i) => angleSlice * i - Math.PI / 2)
            .radius(d => rScale(d.count))
            .curve(d3.curveLinearClosed);
        
        svg.append("path")
            .datum(types.map(t => ({count: typeCounts[t]})))
            .attr("d", radarLine)
            .attr("fill", "rgba(70, 130, 180, 0.2)")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2);
        
        // Add interactivity
        svg.selectAll(".type-point")
            .data(types)
            .enter()
            .append("circle")
            .attr("class", "type-point")
            .attr("cx", (d, i) => Math.cos(angleSlice * i - Math.PI / 2) * rScale(typeCounts[d]))
            .attr("cy", (d, i) => Math.sin(angleSlice * i - Math.PI / 2) * rScale(typeCounts[d]))
            .attr("r", 4)
            .attr("fill", d => typeColors[d] || "#000")
            .on("mouseover", function(event, d) {
                d3.select(this).attr("r", 6);
                d3.select("#tooltip")
                    .style("opacity", 1)
                    .html(`<strong>${d}</strong><br>Count: ${typeCounts[d]}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).attr("r", 4);
                d3.select("#tooltip").style("opacity", 0);
            });
    }

    // 2. Parallel Coordinates Plot
    function createParallelChart() {
        const svg = d3.select("#parallel")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);
        
        // Dimensions to show
        const dimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
        
        // Scales for each dimension
        const y = {};
        dimensions.forEach(dim => {
            y[dim] = d3.scaleLinear()
                .domain(d3.extent(data, d => +d[dim]))
                .range([height, 0]);
        });
        
        // X scale for dimensions
        const x = d3.scalePoint()
            .domain(dimensions)
            .range([0, width])
            .padding(0.5);
        
        // Draw axes
        svg.selectAll(".dimension")
            .data(dimensions)
            .enter()
            .append("g")
            .attr("class", "dimension")
            .attr("transform", d => `translate(${x(d)})`)
            .each(function(d) {
                d3.select(this).call(d3.axisLeft(y[d]));
                d3.select(this).append("text")
                    .attr("y", -15)
                    .attr("text-anchor", "middle")
                    .text(d)
                    .style("font-size", "12px");
            });
        
        // Draw lines
        const line = d3.line()
            .defined(d => !isNaN(d.value))
            .x(d => x(d.name))
            .y(d => y[d.name](d.value));
        
        // Sample data (for performance)
        const sampleData = data.length > 200 ? data.filter((d, i) => i % 3 === 0) : data;
        
        svg.selectAll(".line")
            .data(sampleData)
            .enter()
            .append("path")
            .attr("class", "line")
            .attr("d", d => line(dimensions.map(p => ({name: p, value: +d[p]}))))
            .attr("stroke", d => generationColors(d.Generation))
            .attr("stroke-width", 1)
            .attr("stroke-opacity", 0.5)
            .attr("fill", "none")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .attr("stroke-width", 3)
                    .attr("stroke-opacity", 1);
                
                d3.select("#tooltip")
                    .style("opacity", 1)
                    .html(`<strong>${d.Name}</strong><br>Gen: ${d.Generation}<br>Type: ${d.Type_1}${d.Type_2 ? "/" + d.Type_2 : ""}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .attr("stroke-width", 1)
                    .attr("stroke-opacity", 0.5);
                d3.select("#tooltip").style("opacity", 0);
            });
        
        // Add legend (moved more to the right)
        const legend = svg.append("g")
            .attr("transform", `translate(${width - 60}, 20)`);  // Changed from width-100 to width-60
        
        const generations = [...new Set(data.map(d => d.Generation))].sort();
        
        generations.forEach((gen, i) => {
            legend.append("rect")
                .attr("x", 0)
                .attr("y", i * 20)
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", generationColors(gen));
            
            legend.append("text")
                .attr("x", 20)
                .attr("y", i * 20 + 12)
                .text(`Gen ${gen}`)
                .style("font-size", "12px");
        });
    }

    // 3. Scatter Plot - Attack vs. Defense
    function createScatterPlot() {
        const svg = d3.select("#scatter")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);
        
        // Scales
        const x = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.Attack) * 1.1])
            .range([0, width]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.Defense) * 1.1])
            .range([height, 0]);
        
        const size = d3.scaleSqrt()
            .domain([0, d3.max(data, d => d.Total)])
            .range([2, 10]);
        
        // Axes
        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x));
        
        svg.append("g")
            .call(d3.axisLeft(y));
        
        // Labels
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .attr("text-anchor", "middle")
            .text("Attack");
        
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 15)
            .attr("x", -height / 2)
            .attr("text-anchor", "middle")
            .text("Defense");
        
        // Points
        svg.selectAll(".point")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "point")
            .attr("cx", d => x(d.Attack))
            .attr("cy", d => y(d.Defense))
            .attr("r", d => size(d.Total))
            .attr("fill", d => d.isLegendary ? "#FFD700" : "#4682B4")
            .attr("opacity", 0.7)
            .on("mouseover", function(event, d) {
                d3.select(this).attr("opacity", 1).attr("r", size(d.Total) * 1.5);
                
                d3.select("#tooltip")
                    .style("opacity", 1)
                    .html(`<strong>${d.Name}</strong><br>Attack: ${d.Attack}<br>Defense: ${d.Defense}<br>Total: ${d.Total}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function(d) {
                d3.select(this).attr("opacity", 0.7).attr("r", size(d.Total));
                d3.select("#tooltip").style("opacity", 0);
            });
        
        // Legend (moved more to the right)
        const legend = svg.append("g")
            .attr("transform", `translate(${width - 60}, 20)`);  // Changed from width-100 to width-60
        
        legend.append("circle")
            .attr("cx", 10)
            .attr("cy", 10)
            .attr("r", 5)
            .attr("fill", "#4682B4");
        
        legend.append("text")
            .attr("x", 20)
            .attr("y", 13)
            .text("Regular")
            .style("font-size", "12px");
        
        legend.append("circle")
            .attr("cx", 10)
            .attr("cy", 35)
            .attr("r", 5)
            .attr("fill", "#FFD700");
        
        legend.append("text")
            .attr("x", 20)
            .attr("y", 38)
            .text("Legendary")
            .style("font-size", "12px");
        
        // Size legend (moved more to the right)
        const sizeLegend = svg.append("g")
            .attr("transform", `translate(${width - 60}, 70)`);  // Changed from width-100 to width-60
        
        const sizeValues = [200, 400, 600];
        
        sizeValues.forEach((val, i) => {
            sizeLegend.append("circle")
                .attr("cx", 10)
                .attr("cy", i * 20 + 10)
                .attr("r", size(val))
                .attr("fill", "none")
                .attr("stroke", "#000")
                .attr("stroke-width", 1);
            
            sizeLegend.append("text")
                .attr("x", 10 + size(val) + 5)
                .attr("y", i * 20 + 13)
                .text(val)
                .style("font-size", "12px");
        });
        
        sizeLegend.append("text")
            .attr("x", 0)
            .attr("y", 0)
            .text("Total Stats")
            .style("font-size", "12px");
    }

    // Create all charts
    createRadarChart();
    createParallelChart();
    createScatterPlot();
});