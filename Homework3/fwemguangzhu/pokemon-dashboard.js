// Main dashboard script that loads and visualizes Pokemon data

// Load data from CSV file
d3.csv("pokemon_alopez247.csv").then(function(data) {
    // Data preprocessing - convert strings to numbers/booleans
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

    // Set dimensions and margins for charts
    const margin = {top: 50, right: 80, bottom: 50, left: 50};
    const width = 900 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    const radarRadius = Math.min(width, height) / 2;

    // Color scales for consistent coloring across charts
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

    // 1. Radar Chart - Shows distribution of Pokemon types
    function createRadarChart() {
        // Create SVG container
        const svg = d3.select("#radar")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${width/2 + margin.left}, ${height/2 + margin.top})`);

        // Count how many Pokemon have each type (including secondary types)
        const typeCounts = {};
        data.forEach(d => {
            if (d.Type_1) typeCounts[d.Type_1] = (typeCounts[d.Type_1] || 0) + 1;
            if (d.Type_2) typeCounts[d.Type_2] = (typeCounts[d.Type_2] || 0) + 1;
        });
        
        // Filter out undefined types and sort alphabetically
        const types = Object.keys(typeCounts).filter(t => t).sort();
        const maxCount = d3.max(Object.values(typeCounts));
        
        // Radial scale for the radar chart
        const rScale = d3.scaleLinear()
            .domain([0, maxCount])
            .range([0, radarRadius]);
        
        // Calculate angle for each type
        const angleSlice = Math.PI * 2 / types.length;
        
        // Draw axes for each type
        types.forEach((type, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            const lineLength = radarRadius * 0.95;
            
            // Draw axis line
            svg.append("line")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", Math.cos(angle) * lineLength)
                .attr("y2", Math.sin(angle) * lineLength)
                .attr("stroke", "#ddd")
                .attr("stroke-width", 1);
            
            // Add type label at the end of each axis
            svg.append("text")
                .attr("x", Math.cos(angle) * (lineLength + 20))
                .attr("y", Math.sin(angle) * (lineLength + 20))
                .text(type)
                .attr("fill", typeColors[type] || "#000")
                .style("font-size", "12px")
                .style("text-anchor", "middle");
            
            // Add concentric circles as grid lines
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
        
        // Create radar line generator
        const radarLine = d3.lineRadial()
            .angle((d, i) => angleSlice * i - Math.PI / 2)
            .radius(d => rScale(d.count))
            .curve(d3.curveLinearClosed);
        
        // Draw the radar shape
        svg.append("path")
            .datum(types.map(t => ({count: typeCounts[t]})))
            .attr("d", radarLine)
            .attr("fill", "rgba(70, 130, 180, 0.2)")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2);
        
        // Add interactive points at each type's value
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

// 2. Parallel Coordinates Plot - Compares stats across Pokemon
function createParallelChart() {
    // Create SVG container
    const svg = d3.select("#parallel")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom + 40)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // Stats dimensions to display
    const dimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
    
    // Create scales for each dimension
    const y = {};
    dimensions.forEach(dim => {
        y[dim] = d3.scaleLinear()
            .domain(d3.extent(data, d => +d[dim]))
            .range([height, 0]);
    });
    
    // X scale for positioning dimensions
    const x = d3.scalePoint()
        .domain(dimensions)
        .range([0, width])
        .padding(0.5);
    
    // Draw axes for each dimension
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
    
    // Line generator for the parallel coordinates
    const line = d3.line()
        .defined(d => !isNaN(d.value))
        .x(d => x(d.name))
        .y(d => y[d.name](d.value));
    
    // Sample data for better performance with many data points
    const sampleData = data.length > 200 ? data.filter((d, i) => i % 3 === 0) : data;
    
    // Create a group for all the lines
    const linesGroup = svg.append("g")
        .attr("class", "lines-group");
    
    // Draw all lines without hover interactions
    const lines = linesGroup.selectAll(".line")
        .data(sampleData)
        .enter()
        .append("path")
        .attr("class", "line")
        .attr("d", d => line(dimensions.map(p => ({name: p, value: +d[p]}))))
        .attr("stroke", d => generationColors(d.Generation))
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.5)
        .attr("fill", "none");
    
    // Store active brushes
    let activeBrushes = {};
    
    // Add brush groups for each dimension
    const brushGroups = svg.selectAll(".brush")
        .data(dimensions)
        .enter()
        .append("g")
        .attr("class", "brush")
        .attr("transform", d => `translate(${x(d) - 10}, 0)`);
    
    // Create brushes for each dimension
    brushGroups.each(function(dim) {
        d3.select(this).call(
            d3.brushY()
                .extent([[-10, 0], [20, height]])
                .on("brush", brushed)
                .on("end", brushEnded)
        );
    });
    
    // Brush event handler
    function brushed(event, dim) {
        if (!event.selection) return;
        
        // Store the brush extent (inverted because y-scale is inverted)
        const [y0, y1] = event.selection;
        activeBrushes[dim] = [y[dim].invert(y1), y[dim].invert(y0)];
        
        highlightBrushedLines();
    }
    
    // Brush ended event handler
    function brushEnded(event, dim) {
        if (!event.selection) {
            delete activeBrushes[dim];
        }
        highlightBrushedLines();
    }
    
    // Highlight lines that pass all active brushes
    function highlightBrushedLines() {
        lines
            .attr("stroke-opacity", d => isBrushed(d) ? 0.8 : 0.2)
            .attr("stroke-width", d => isBrushed(d) ? 2 : 1);
    }
    
    // Check if a data point passes all active brushes
    function isBrushed(d) {
        if (Object.keys(activeBrushes).length === 0) return false;
        
        return Object.entries(activeBrushes).every(([dim, [min, max]]) => {
            const value = +d[dim];
            return value >= min && value <= max;
        });
    }
    
    // Add reset button to clear all brushes
    const resetButton = svg.append("g")
        .attr("class", "reset-button")
        .attr("transform", `translate(${width - 100}, ${height + 20})`)
        .style("cursor", "pointer")
        .on("click", resetAllBrushes);
    
    resetButton.append("rect")
        .attr("width", 80)
        .attr("height", 25)
        .attr("rx", 5)
        .attr("fill", "#e0e0e0")
        .attr("stroke", "#999");
    
    resetButton.append("text")
        .attr("x", 40)
        .attr("y", 16)
        .attr("text-anchor", "middle")
        .text("Reset Brushes")
        .style("font-size", "12px");
    
    // Reset all brushes function
    function resetAllBrushes() {
        // Clear all brushes visually
        svg.selectAll(".brush").call(d3.brushY().clear);
        
        // Reset active brushes
        activeBrushes = {};
        
        // Reset all lines to default appearance
        lines
            .attr("stroke-opacity", 0.5)
            .attr("stroke-width", 1);
    }
    
    // Add generation legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 60}, 20)`);
    
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

// 3. Scatter Plot - Attack vs. Defense with Type Filtering
function createScatterPlot() {
    // Create SVG container
    const svg = d3.select("#scatter")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom + 40)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Get all unique types from the data
    const allTypes = [...new Set(data.flatMap(d => [d.Type_1, d.Type_2].filter(Boolean)))].sort();
    
    // Create dropdown container
    const dropdownContainer = d3.select("#scatter")
        .insert("div", ":first-child")
        .attr("class", "type-filter-container");
    
    // Create dropdown label
    dropdownContainer.append("label")
        .attr("for", "type-select")
        .text("Filter by Type:");
    
    // Create multi-select dropdown
    const dropdown = dropdownContainer.append("select")
        .attr("id", "type-select")
        .attr("multiple", true);
    
    // Add default "All Types" option
    dropdown.append("option")
        .attr("value", "all")
        .text("All Types")
        .property("selected", true);
    
    // Add type options
    dropdown.selectAll("type-option")
        .data(allTypes)
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d)
        .style("background-color", d => typeColors[d] || "#eee");
    
    // Add change handler for filtering
    dropdown.on("change", function() {
        const selectedOptions = Array.from(this.selectedOptions)
            .map(option => option.value)
            .filter(value => value !== "all");
        
        if (selectedOptions.length === 0 || this.querySelector('option[value="all"]:checked')) {
            // Show all data points
            updatePlot(data);
            // Keep "All Types" selected if nothing else is selected
            this.querySelector('option[value="all"]').selected = true;
        } else {
            // Filter data to ONLY include Pokémon that have ANY of the selected types
            const filteredData = data.filter(d => 
                selectedOptions.includes(d.Type_1) || 
                (d.Type_2 && selectedOptions.includes(d.Type_2))
            );
            updatePlot(filteredData);
            // Ensure "All Types" is not selected
            this.querySelector('option[value="all"]').selected = false;
        }
    });

    // Create scales
    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Attack) * 1.1])
        .range([0, width]);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Defense) * 1.1])
        .range([height, 0]);
    
    const size = d3.scaleSqrt()
        .domain([0, d3.max(data, d => d.Total)])
        .range([2, 10]);
    
    // Draw axes
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));
    
    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));
    
    // Add axis labels
    svg.append("text")
        .attr("class", "x-label")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .attr("text-anchor", "middle")
        .text("Attack");
    
    svg.append("text")
        .attr("class", "y-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .text("Defense");
    
    // Create a group for points
    const pointsGroup = svg.append("g")
        .attr("class", "points-group");
    
    // Initial plot with all data
    updatePlot(data);
    
    // Update plot with filtered data
    function updatePlot(plotData) {
        // Update points with animation
        const points = pointsGroup.selectAll(".point")
            .data(plotData, d => d.Name);
            
        // Exit animation
        points.exit()
            .transition()
            .duration(500)
            .attr("r", 0)
            .attr("opacity", 0)
            .remove();
        
        // Enter animation for new points
        points.enter()
            .append("circle")
            .attr("class", "point")
            .attr("cx", d => x(d.Attack))
            .attr("cy", d => y(d.Defense))
            .attr("r", 0)
            .attr("fill", d => d.isLegendary ? "#FFD700" : "#4682B4")
            .attr("opacity", 0.7)
            .transition()
            .duration(500)
            .attr("r", d => size(d.Total));
        
        // Update existing points
        points.transition()
            .duration(500)
            .attr("cx", d => x(d.Attack))
            .attr("cy", d => y(d.Defense))
            .attr("r", d => size(d.Total))
            .attr("opacity", 0.7)
            .attr("fill", d => d.isLegendary ? "#FFD700" : "#4682B4");
    }
    
    // Add legend for Pokemon types (regular vs legendary)
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 60}, 20)`);
    
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
    
    // Add size legend to show what circle sizes represent
    const sizeLegend = svg.append("g")
        .attr("transform", `translate(${width - 60}, 70)`);
    
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